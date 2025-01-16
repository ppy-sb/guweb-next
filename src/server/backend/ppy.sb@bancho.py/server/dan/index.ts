import { type InferInsertModel, aliasedTable, and, asc, count, desc, eq, exists, getTableName, inArray, like, or, sql } from 'drizzle-orm'
import { type MySql2Database } from 'drizzle-orm/mysql2'
import { danSQLChunks } from '../../utils/sql-dan'
import { type Id, type ScoreId, hasRuleset } from '../..'
import { BanchoPyScoreStatus } from '../../../bancho.py/enums'
import { useDrizzle } from '../../../bancho.py/server/source/drizzle'
import {
  fromBanchoMode,
  fromBanchoPyMode,
  idToString,
  scoreIdToString,
  stringToId,
  stringToScoreId,
  toBeatmapset,
  toMods,
  toScore,
} from '../../../bancho.py/transforms'
import * as schema from '../../drizzle/schema'
import { RealtimeDanProcessor } from './processor/realtime'
import { IntervalDanProcessor } from './processor/interval'
import { NoopDanProcessor } from './processor/noop'
import { type BaseDanProcessor } from './processor/$base'
import { type UserCompact } from '~/def/user'
import { GucchoError } from '~/def/messages'
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, OP, Requirement } from '~/def/dan'
import { DanProvider as Base } from '$base/server'
import { validateCond } from '~/common/utils/dan'
import { Mode, Ruleset } from '~/def'
import { config } from '$active/env'
import { type Grade } from '~/def/score'
import { type PaginatedResult } from '~/def/pagination'

type Database = MySql2Database<typeof schema>

export class DanProvider extends Base<Id, ScoreId> {
  static readonly idToString = idToString
  static readonly stringToId = stringToId

  static readonly stringToScoreId = stringToScoreId
  static readonly scoreIdToString = scoreIdToString
  config = config()

  processor: BaseDanProcessor = this.config.dan
    ? this.config.dan.processor === 'realtime'
      ? new RealtimeDanProcessor(this)
      : new IntervalDanProcessor(this as DanProvider & { config: { dan: { interval: number } } })
    : new NoopDanProcessor(this)

  readonly tbl = {
    users: schema.users,
    scores: schema.scores,
    beatmaps: schema.beatmaps,
    sources: schema.sources,

    requirementClearedScores: schema.requirementClearedScores,
  }

  constructor() {
    super()
    this.processor.init()
  }

  drizzle = useDrizzle(schema)
  async get(id: Id, tx: Database = this.drizzle): Promise<DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>> {
    const dan = await tx.query.dans.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, id)
      },
      orderBy: dan => asc(dan.id),
      with: {
        requirements: {
          columns: {
            condId: true,
            type: true,
          },
        },
      },
    })

    if (!dan) {
      throwGucchoError(GucchoError.DanNotFound)
    }

    return await this.getDanWithRequirements(dan, tx)
  }

  async getDanWithRequirements(dan: {
    id: Id
    name: string
    createdAt: Date
    description: string | null
    creator?: Id | null
    updater?: Id | null
    updatedAt: Date
    requirements: {
      type: Requirement
      condId: Id
    }[]
  },
    tx: Database = this.drizzle
  ): Promise<DatabaseDan<Id>> {
    // Extract root condition IDs from requirements
    const rootCondIds = dan.requirements.map(r => r.condId)

    const built = await this.#fetchAndBuildCondTree(rootCondIds, tx)

    const requirementsWithConds = dan.requirements.map((req) => {
      const cond = built[req.condId]
      if (!cond) {
        throw new Error(`Root condition with id ${req.condId} not found`)
      }
      return {
        ...req,
        dan: dan.id,
        type: req.type === 'pass' ? Requirement.Pass : Requirement.NoPause,
        cond,
      }
    })

    return {
      ...dan,
      description: dan.description ?? '',
      requirements: requirementsWithConds,
      creator: dan.creator ?? undefined,
      updater: dan.updater ?? undefined,
    }
  }

  async #fetchAndBuildCondTree(ids: Id[], tx: Database): Promise<Record<Id, Cond>> {
    // Fetch all conditions starting from rootCondIds using a recursive CTE
    const [conditionsResult] = await tx.execute(
      sql`
      WITH RECURSIVE cond_tree AS (
        SELECT ${schema.danConds.id}, ${schema.danConds.type}, ${schema.danConds.value}, ${schema.danConds.parent}
        FROM ${schema.danConds}
        WHERE id IN ${ids}
        UNION ALL
        SELECT dc.id, dc.type, dc.value, dc.parent
        FROM ${schema.danConds} dc
        INNER JOIN cond_tree ct ON dc.parent = ct.id
      )
      SELECT id, type, value, parent
      FROM cond_tree
    `
    )

    return this.#buildCondTreeMem(ids, conditionsResult as unknown as DanCondRow[])
  }

  #buildCondTreeMem(ids: Id[], rows: DanCondRow[]) {
    // Build a map of conditions by id
    const condMap = new Map<number, CondNode>()
    for (const row of rows) {
      condMap.set(row.id, {
        id: row.id,
        type: row.type,
        value: row.value,
        parent: row.parent,
        children: [],
      })
    }

    // Build the tree by linking child conditions to their parents
    for (const cond of condMap.values()) {
      if (cond.parent !== 0 && condMap.has(cond.parent)) {
        const parentCond = condMap.get(cond.parent)
        parentCond?.children.push(cond)
      }
    }

    return Object.fromEntries(ids.map(id => [id, transformCond(condMap.get(id) ?? throwGucchoError(GucchoError.DanNotFound))]))
  }

  // TODO delete requirement
  async delete(id: number): Promise<void> {
    await this.drizzle.transaction(async (tx) => {
      await tx.delete(schema.requirementCondBindings).where(eq(schema.requirementCondBindings.danId, id))
      await tx.delete(schema.dans).where(eq(schema.dans.id, id))
    })
  }

  async search(a: {
    keyword: string
    mode?: Mode
    ruleset?: Ruleset
    page: number
    perPage: number
    rulesetDefaultsToStandard?: boolean
  }): Promise<PaginatedResult<DatabaseDan<Id>>> {
    return this.drizzle.transaction<PaginatedResult<DatabaseDan<Id>>>(async (tx) => {
      const dans = aliasedTable(schema.dans, 'd')
      const searchCondTree = this.#virtualTableDanTreeAlias('cond_tree')
      const danCondBinding = aliasedTable(schema.requirementCondBindings, 'dc')
      const bmId = aliasedTable(schema.beatmaps, 'b_id')
      const bmMd5 = aliasedTable(schema.beatmaps, 'b_md5')

      const condTreeModeCheck = this.#virtualTableDanTreeAlias('mode_check')
      const condTreeRulesetCheck = this.#virtualTableDanTreeAlias('ruleset_check')

      const dansLateral = aliasedTable(schema.dans, 'd_l')
      const condTreeLateral = this.virtualTableDanTreeSimpleAlias('full_tree')
      const danCondBindingLateral = aliasedTable(schema.requirementCondBindings, 'dc_l')
      const bmIdLateral = aliasedTable(schema.beatmaps, 'b_id_l')
      const bmMd5Lateral = aliasedTable(schema.beatmaps, 'b_md5_l')

      // const sq_md5 = tx.$with('sq_md5').as(
      //   tx.select({
      //     md5: schema.scores.mapMd5,
      //     mode: schema.scores.mode,
      //     count: count().as('count_sq_md5'),
      //   })
      //     .from(schema.scores)
      //     .groupBy(schema.scores.mapMd5, schema.scores.mode)
      // )

      // const sq_bid = tx.$with('sq_bid').as(
      //   tx.select({
      //     bid: schema.beatmaps.id,
      //     mode: schema.scores.mode,
      //     count: count().as('count_sq_bid'),
      //   })
      //     .from(schema.scores)
      //     .innerJoin(schema.beatmaps, eq(schema.scores.mapMd5, schema.beatmaps.md5))
      //     .groupBy(schema.beatmaps.id, schema.scores.mode)
      // )

      const _sql = tx
        // .with(sq_md5, sq_bid)
        .select({
          id: dans.id,
          name: dans.name,
          description: dans.description,
          creator: dans.creator,
          createdAt: dans.createdAt,
          updater: dans.updater,
          updatedAt: dans.updatedAt,

          possibleBids: sql<Id[]>`
            CAST(
              CONCAT(
                '[',
                GROUP_CONCAT(
                  DISTINCT
                    CASE
                        WHEN ${bmIdLateral.id} THEN ${bmIdLateral.id}
                        ELSE ${bmMd5Lateral.id}
                    END
                ),
                ']'
              ) AS JSON
            )`.as('possible_bids'),

          requirements: sql<Array<{ type: Requirement; rootCond: Id }>>`
            CAST(
              CONCAT(
                '[',
                GROUP_CONCAT(
                  DISTINCT JSON_OBJECT(
                    'type', ${danCondBindingLateral.type},
                    'rootCond', ${danCondBindingLateral.condId}
                  )
                ),
                ']'
              ) AS JSON
            )`.as('requirements'),

          fullTree: sql<Array<{ id: Id; type: OP; value: string; parent: Id }>>`JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ${condTreeLateral.column.id},
                'type', ${condTreeLateral.column.type},
                'value', ${condTreeLateral.column.value},
                'parent', ${condTreeLateral.column.parent}
              )
            )`.as('full_tree'),

        })
        .from(dans)
        .innerJoin(danCondBinding, eq(dans.id, danCondBinding.danId))
        .innerJoin(searchCondTree.aliasedTable, eq(searchCondTree.column.root, danCondBinding.condId))
        // cannot use OR here because it will prevent index usage.
        .leftJoin(bmId, and(eq(searchCondTree.column.type, OP.BanchoBeatmapIdEq), eq(bmId.id, searchCondTree.column.value), eq(bmId.server, 'osu!')))
        .leftJoin(bmMd5, and(eq(searchCondTree.column.type, OP.BeatmapMd5Eq), eq(bmMd5.md5, searchCondTree.column.value)))

        .innerJoin(dansLateral, eq(dans.id, dansLateral.id))
        .innerJoin(danCondBindingLateral, eq(dansLateral.id, danCondBindingLateral.danId))
        .innerJoin(condTreeLateral.aliasedTable, eq(danCondBindingLateral.condId, condTreeLateral.column.root))
        .leftJoin(bmIdLateral, and(eq(condTreeLateral.column.type, OP.BanchoBeatmapIdEq), eq(bmIdLateral.id, condTreeLateral.column.value), eq(bmIdLateral.server, 'osu!')))
        .leftJoin(bmMd5Lateral, and(eq(condTreeLateral.column.type, OP.BeatmapMd5Eq), eq(bmMd5Lateral.md5, condTreeLateral.column.value)))
        // .leftJoin(sq_bid, eq(bmId.id, sq_bid.bid))
        // .leftJoin(sq_md5, eq(bmMd5.md5, sq_md5.md5))
        .where(
          and(

            // keyword
            or(
              // search name
              like(dans.name, `%${a.keyword}%`),

              // search description
              like(dans.description, `%${a.keyword}%`),

              // search conditions
              and(
                // must be truthy conditions
                eq(searchCondTree.column.truthy, 1),

                or(
                  // mode eq 'mania'
                  // bancho beatmap id eq
                  // beatmap md5 eq
                  and(
                    inArray(searchCondTree.column.type, [
                      OP.ModeEq,
                      OP.BanchoBeatmapIdEq,
                      OP.BeatmapMd5Eq,
                    ]),
                    eq(searchCondTree.column.value, a.keyword),
                  ),

                  // further search matched beatmaps
                  or(
                    like(bmId.artist, `%${a.keyword}%`),
                    like(bmId.title, `%${a.keyword}%`),
                    like(bmId.creator, `%${a.keyword}%`),
                    like(bmId.diff, `%${a.keyword}%`),
                    like(bmId.filename, `%${a.keyword}%`),
                    like(bmMd5.artist, `%${a.keyword}%`),
                    like(bmMd5.title, `%${a.keyword}%`),
                    like(bmMd5.creator, `%${a.keyword}%`),
                    like(bmId.diff, `%${a.keyword}%`),
                    like(bmId.filename, `%${a.keyword}%`),
                  ),
                )
              ),

            )
              ?.if(a.keyword),

            // filter mode
            exists(
              tx.select({ 1: sql`1` })
                .from(condTreeModeCheck.aliasedTable)
                .where(
                  and(
                    eq(condTreeModeCheck.column.root, danCondBinding.condId),
                    eq(condTreeModeCheck.column.type, OP.ModeEq),
                    eq(condTreeModeCheck.column.value, a.mode),
                    eq(condTreeModeCheck.column.truthy, 1),
                  ),
                )
            )
              ?.if(a.mode),

            // filter ruleset
            exists(
              tx.select({ 1: sql`1` })
                .from(condTreeRulesetCheck.aliasedTable)
                .where(
                  and(
                    eq(condTreeRulesetCheck.column.root, danCondBinding.condId),
                    eq(condTreeRulesetCheck.column.truthy, 1),
                    eq(condTreeRulesetCheck.column.type, OP.RulesetEq),
                    eq(condTreeRulesetCheck.column.value, a.ruleset),
                  ),
                )
            )
              ?.if(a.ruleset)
              ?.if(!((a.rulesetDefaultsToStandard && a.ruleset === Ruleset.Standard)))
              // validate ruleset and server support status
              ?.if(
                (a.mode && a.ruleset)
                  ? hasRuleset(a.mode, a.ruleset)
                  : true
              )
              // Mania only supports standard ruleset so ruleset is not required
              ?.if(a.mode !== Mode.Mania),
          )
        )
        // .orderBy(
        //   desc(sq_md5.count),
        //   desc(sq_bid.count),
        // )
        .groupBy(dans.id)

      const count = await tx.$count(_sql.as('count'))

      if (!count) {
        return {
          total: 0,
          data: [],
        } as PaginatedResult<DatabaseDan<Id>>
      }

      try {
        const result = await _sql
          .orderBy(
            desc(dans.updatedAt),
            desc(dans.id),
          )
          .limit(a.perPage)
          .offset(a.page * a.perPage)

        return {
          total: count,
          data: result.map((i) => {
            const conds = this.#buildCondTreeMem(i.requirements.map(r => r.rootCond), i.fullTree.toSorted((a, b) => a.id - b.id))
            return {
              ...pick(i, ['id', 'name', 'description']),
              creator: i.creator ?? undefined,
              updater: i.updater ?? undefined,
              createdAt: i.createdAt,
              updatedAt: i.updatedAt,
              requirements: i.requirements.map((req) => {
                return {
                  type: req.type,
                  cond: conds[req.rootCond],
                }
              }),
            }
          }),
        } satisfies PaginatedResult<DatabaseDan<Id>>
      }
      catch (e) {
        console.error(e)
        throw e
      }
    })
  }

  readonly #preparedClearedScores = this.drizzle.select({
    score: schema.scores,
    beatmap: schema.beatmaps,
    source: schema.sources,
    dan: schema.dans,
    requirement: schema.requirementCondBindings,
  })
    .from(schema.scores)
    .innerJoin(schema.beatmaps, eq(schema.scores.mapMd5, schema.beatmaps.md5))
    .innerJoin(schema.sources, and(
      eq(schema.beatmaps.setId, schema.sources.id),
      eq(schema.beatmaps.server, schema.sources.server)
    ))
    .innerJoin(schema.requirementClearedScores, eq(schema.scores.id, schema.requirementClearedScores.scoreId))
    .innerJoin(schema.requirementCondBindings, and(
      eq(schema.requirementClearedScores.dan, schema.requirementCondBindings.danId),
      eq(schema.requirementClearedScores.requirement, schema.requirementCondBindings.type),
    ))
    .innerJoin(schema.dans, eq(schema.requirementCondBindings.danId, schema.dans.id))
    // .innerJoin(schema.danConds, eq(schema.requirementCondBindings.condId, schema.danConds.id))
    .where(({ dan }) => eq(dan.id, sql.placeholder('danId')))
    .limit(100)
    .prepare()

  async clearedScores(a: Id) {
    const data = await this.#preparedClearedScores.execute({ danId: a })

    return data.map(({ score, source, beatmap, dan, requirement }) => {
      const [mode, ruleset] = fromBanchoPyMode(score.mode)
      return {
        score: toScore({ score, beatmap, mode, ruleset, source }),
        dan,
        requirement,
      }
    })
  }

  async getUserClearedDans(opt: { user: Pick<UserCompact<Id>, 'id'>; page: number; perPage?: number }): Promise<Array<Base.UserDanClearedScore<Id, ScoreId>>> {
    // derived tables
    const s1 = aliasedTable(schema.scores, 's1')

    const sq = this.drizzle.select({
      ...pick(s1, ['id', 'mode', 'accuracy', 'score', 'pp', 'maxCombo', 'grade', 'mapMd5', 'userId', 'mods', 'playTime']) as Pick<typeof s1, 'id' | 'mode' | 'accuracy' | 'score' | 'pp' | 'maxCombo' | 'grade' | 'mapMd5' | 'userId' | 'mods' | 'playTime'>,
      rn: sql`rank() over (partition by ${s1.mode}, ${s1.mapMd5}, ${s1.userId} order by ${s1.score} desc)`.as('rn'),
    })
      .from(s1)
      .as('sq')

    const res = await this.drizzle.select({
      dan: {
        id: schema.dans.id,
        name: schema.dans.name,
      },
      requirements: sql<Requirement[]>`JSON_ARRAYAGG(${schema.requirementCondBindings.type})`.as('requirements'),
      score: {
        id: sq.id,
        mode: sq.mode,
        accuracy: sq.accuracy,
        score: sq.score,
        pp: sq.pp,
        maxCombo: sq.maxCombo,
        grade: sq.grade,
        mods: sq.mods,
        playedAt: sq.playTime,
      },
      beatmap: {
        mode: schema.beatmaps.mode,
        id: schema.beatmaps.id,
        md5: schema.beatmaps.md5,
        creator: schema.beatmaps.creator,
        version: schema.beatmaps.version,
        diff: schema.beatmaps.diff,
        lastUpdate: schema.beatmaps.lastUpdate,
      },

      beatmapset: {
        id: schema.beatmaps.setId,
        artist: schema.beatmaps.artist,
        title: schema.beatmaps.title,
        source: schema.beatmaps.server,
      },

    })
      .from(schema.requirementClearedScores)
      .innerJoin(schema.requirementCondBindings, and(
        eq(schema.requirementClearedScores.dan, schema.requirementCondBindings.danId),
        eq(schema.requirementClearedScores.requirement, schema.requirementCondBindings.type),
      ))
      .innerJoin(schema.dans, eq(schema.requirementCondBindings.danId, schema.dans.id))
      .innerJoin(sq, eq(schema.requirementClearedScores.scoreId, sq.id))
      .innerJoin(schema.beatmaps, eq(sq.mapMd5, schema.beatmaps.md5))
      .groupBy(schema.dans.id, sq.id)
      .orderBy(
        desc(schema.beatmaps.diff),
        desc(count(schema.requirementCondBindings.type)),
      )
      .where(and(
        eq(sq.userId, opt.user.id),
        eq(sq.rn, 1),
      ))

    return res.map((i) => {
      const [mode, ruleset] = fromBanchoPyMode(i.score.mode)
      return {
        dan: i.dan,
        requirements: i.requirements,
        score: {
          ...i.score,
          mods: toMods(i.score.mods),
          mode,
          ruleset,
          score: BigInt(i.score.score),
          beatmap: {
            ...i.beatmap,
            mode: fromBanchoMode(i.beatmap.mode),
            beatmapset: toBeatmapset({
              id: i.beatmapset.id,
              server: 'osu!',
            }, i.beatmapset),
          },
          grade: (i.score.grade === 'N' ? 'F' : i.score.grade) as Grade,
        },
      } satisfies Base.UserDanClearedScore<Id, ScoreId>
    })
  }

  async getQualifiedScores(id: Id, requirement: Requirement, page: number, perPage: number): Promise<Base.RequirementQualifiedScore<Id, ScoreId>> {
    const dan = await this.get(id)

    const req = dan.requirements.find(a => a.type === requirement)?.cond
    if (!req) {
      return { count: 0, scores: [] }
    }

    const _sql = this.drizzle.select({
      player: {
        id: this.tbl.users.id,
        name: this.tbl.users.name,
      },
      score: {
        id: this.tbl.scores.id,
        accuracy: this.tbl.scores.accuracy,
        score: this.tbl.scores.score,
      },
      beatmap: {
        id: this.tbl.beatmaps.id,
        md5: this.tbl.beatmaps.md5,
        title: this.tbl.beatmaps.title,
        artist: this.tbl.beatmaps.artist,
        version: this.tbl.beatmaps.version,
      },
    })
      .from(this.tbl.scores)
      .innerJoin(this.tbl.beatmaps, eq(this.tbl.scores.mapMd5, this.tbl.beatmaps.md5))
      .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))

    const _count = await this.drizzle
      .select({ count: count() })
      .from(this.tbl.scores)
      .innerJoin(this.tbl.beatmaps, eq(this.tbl.scores.mapMd5, this.tbl.beatmaps.md5))
      .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))
      .where(
        and(
          eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
          danSQLChunks(req, dan.requirements, this.tbl),
        )
      )
      .limit(1).then(res => res[0].count)

    if (!_count) {
      return { count: 0, scores: [] }
    }

    const res = await _sql
      .where(
        and(
          eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
          danSQLChunks(req, dan.requirements, this.tbl),
        )
      )
      .offset(perPage * page)
      .limit(perPage)

    return {
      count: _count,
      scores: res,
    }
  }

  async runCustomDan(opt: Dan): Promise<Array<Base.RequirementQualifiedScore<Id, ScoreId>>> {
    return await this.drizzle.transaction(async (tx) => {
      const q = tx.select({
        player: {
          id: this.tbl.users.id,
          name: this.tbl.users.name,
        },
        score: {
          id: this.tbl.scores.id,
          accuracy: this.tbl.scores.accuracy,
          score: this.tbl.scores.score,
        },
        beatmap: {
          id: this.tbl.beatmaps.id,
          md5: this.tbl.beatmaps.md5,
          title: this.tbl.beatmaps.title,
          artist: this.tbl.beatmaps.artist,
          version: this.tbl.beatmaps.version,
        },
      })
        .from(this.tbl.scores)
        .innerJoin(this.tbl.beatmaps, eq(this.tbl.scores.mapMd5, this.tbl.beatmaps.md5))
        .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))

      // opt.requirements.sort((a, b) => b.type === Requirement.NoPause ? -1 : 1)

      return await Promise.all(
        opt.requirements.map(async (a) => {
          const _count = await tx
            .select({ count: count() })
            .from(this.tbl.scores)
            .innerJoin(this.tbl.beatmaps, eq(this.tbl.scores.mapMd5, this.tbl.beatmaps.md5))
            .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))
            .where(
              and(
                eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
                danSQLChunks(a.cond, opt.requirements, this.tbl),
              )
            )
            .limit(1)
            .then(res => res[0].count)

          if (!_count) {
            return { requirement: a.type, count: 0, scores: [] }
          }

          const _sql = q
            .where(
              and(
                eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
                danSQLChunks(a.cond, opt.requirements, this.tbl),
              )
            )
            .orderBy(desc(this.tbl.scores.score))
            .limit(10)

          return {
            requirement: a.type,
            count: _count,
            scores: await _sql,
          }
        }
        )
      )
    })
  }

  // TODO process old scores after saving
  async saveComposed(
    i: Dan | DatabaseDan<Id>,
    u: Pick<UserCompact<Id>, 'id'>
  ): Promise<DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>> {
    return await this.drizzle.transaction(async (tx) => {
      // 1. Insert or update the dan record
      const [result] = await tx
        .insert(schema.dans)
        .values({
          id: 'id' in i ? i.id : undefined,
          name: i.name,
          description: i.description,
          creator: 'creator' in i ? i.creator : u.id,
          updater: u.id,
          // updater: 'updater' in i ? i.updater : u.id,
          createdAt: 'createdAt' in i ? new Date(i.createdAt) : undefined,
          // updatedAt: 'updatedAt' in i ? i.updatedAt : undefined,
        })
        .onDuplicateKeyUpdate({
          set: {
            updater: u.id,
            name: i.name,
            description: i.description,
          },
        })

      const id = (i as DatabaseDan<Id>).id ?? result.insertId
      if (!id) {
        throw new Error(`Failed to save Dan with requirements: ${JSON.stringify(i.requirements)}`)
      }

      // 2. Fetch and delete existing requirement bindings and conditions
      const existingBindings = await tx
        .select({ condId: schema.requirementCondBindings.condId })
        .from(schema.requirementCondBindings)
        .where(eq(schema.requirementCondBindings.danId, id))

      const oldCondIds = existingBindings.map(binding => binding.condId)

      // Delete old conditions recursively
      for (const oldCondId of oldCondIds) {
        await this.deleteCondNodeWithChildren(oldCondId, tx)
      }

      const types: InferInsertModel<typeof schema.requirementCondBindings>[] = []
      // 3. Save new conditions and their tree structures
      for (const r of i.requirements) {
        // Validate the condition
        r.cond = validateCond(r.cond)

        // Recursively save the condition tree and get the root condition ID
        const rootCondId = await this.saveCondTree(r.cond, tx, null)

        if (!rootCondId) {
          throw new Error(`Failed to save cond: ${JSON.stringify(r.cond)}`)
        }

        types.push({
          danId: id,
          condId: rootCondId,
          type: r.type,
        })
      }

      // 4. Link the root condition to the dan via requirement_cond_bindings
      await tx
        .insert(schema.requirementCondBindings)
        .values(types)
        // requires uniqueIndex(danId, type)
        .onDuplicateKeyUpdate({
          set: {
            condId: sql`values(${schema.requirementCondBindings.condId})`,
          },
        })

      // 5. Return the updated dan object
      return await this.get(id, tx)
    }).catch((e) => {
      console.error(e)
      throw e
    })
  }

  private async saveCondTree(
    cond: Cond,
    tx: Database,
    parentId: number | null
  ): Promise<number> {
    switch (cond.type) {
      case OP.AND:
      case OP.OR: {
        // Insert current condition node
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            type: cond.type,
            value: '', // No value for 'and' or 'or'
            parent: parentId,
          })

        const currentId = res.insertId
        if (!currentId) {
          throw new Error(`Failed to insert condition of type ${cond.type}`)
        }

        // Recursively save child conditions
        for (const childCond of cond.cond) {
          await this.saveCondTree(childCond, tx, currentId)
        }

        return currentId
      }
      case OP.NOT: {
        if (!cond.cond) {
          throw new Error('\'not\' operator must have exactly one child')
        }
        // Insert current condition node
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            type: cond.type,
            value: '', // No value for 'not'
            parent: parentId,
          })

        const currentId = res.insertId
        if (!currentId) {
          throw new Error(`Failed to insert condition of type ${cond.type}`)
        }

        // Recursively save the single child condition
        await this.saveCondTree(cond.cond, tx, currentId)

        return currentId
      }
      case OP.Remark: {
        if (!cond.cond) {
          throw new Error('\'remark\' operator must have exactly one child')
        }
        // Insert current condition node
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            type: cond.type,
            value: cond.remark, // Store remark in 'value' field
            parent: parentId,
          })

        const currentId = res.insertId
        if (!currentId) {
          throw new Error(`Failed to insert condition of type ${cond.type}`)
        }

        // Recursively save the child condition
        await this.saveCondTree(cond.cond, tx, currentId)

        return currentId
      }
      case OP.NoPause: {
        // Leaf condition with no value
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            type: cond.type,
            value: '', // No value for 'no-pause'
            parent: parentId,
          })

        const currentId = res.insertId
        if (!currentId) {
          throw new Error(`Failed to insert condition of type ${cond.type}`)
        }

        return currentId
      }
      default: {
        // Leaf conditions with a value
        let valueStr: string
        switch (cond.type) {
          case OP.AccGte:
          case OP.BanchoBeatmapIdEq:
          case OP.ScoreGte:
          case OP.StableModIncludeAny:
          case OP.StableModIncludeAll:
          case OP.Extends:
            valueStr = cond.val.toString()
            break
          case OP.ModeEq:
          case OP.RulesetEq:
            valueStr = cond.val as string
            break
          case OP.BeatmapMd5Eq:
            valueStr = cond.val
            break
          default:
            assertNotReachable(cond)
        }

        // Insert the leaf condition
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            type: cond.type,
            value: valueStr,
            parent: parentId,
          })

        const currentId = res.insertId
        if (!currentId) {
          throw new Error(`Failed to insert condition of type ${cond.type}`)
        }

        return currentId
      }
    }
  }

  private async deleteCondNodeWithChildren(condId: number, tx: Database): Promise<void> {
    try {
      const { column, aliasedTable } = this.#virtualTableDanTreeAlias('c')
      await tx
        .delete(schema.danConds)
        .where(
          inArray(schema.danConds.id,
            tx
              .select({ id: column.id })
              .from(aliasedTable)
              .where(
                eq(column.root, condId)
              )
          )
        )
    }
    catch (e) {
      console.error(e)
    }
  }

  // id | root | type | value | parent | depth | truthy | effective_type
  #danTreeRecursive = /* sql */`
  WITH RECURSIVE conds AS (
    SELECT
        dc.id,
        dc.id AS root,
        dc.type,
        dc.value,
        dc.parent,
        0 AS depth,
        1 AS truthy,
        dc.type AS effective_type
    FROM
        ${getTableName(schema.danConds)} dc
    WHERE
        dc.parent IS NULL
    UNION ALL
    SELECT
        child.id,
        conds.root,
        child.type,
        child.value,
        child.parent,
        conds.depth + 1,
        CASE
            WHEN conds.type = 'not' THEN conds.truthy - 1
            ELSE conds.truthy
        END AS truthy,
        CASE
            WHEN MOD(
                CASE
                    WHEN conds.type = 'not' THEN conds.truthy - 1
                    ELSE conds.truthy
                END,
                2
            ) = 1
            AND child.type IN (
                'and',
                'or'
            ) THEN CASE
                WHEN child.type = 'and' THEN 'or'
                WHEN child.type = 'or' THEN 'and'
                ELSE child.type
            END
            ELSE child.type
        END AS effective_type
    FROM
        conds
        JOIN ${getTableName(schema.danConds)} child
        ON child.parent = conds.id
)
SELECT
    *
FROM
    conds
  `

  #danTreeFullSimple = /* sql */`
  WITH RECURSIVE conds AS (
    SELECT
        dc.id,
        dc.id AS root,
        dc.type,
        dc.value,
        dc.parent
    FROM
        ${getTableName(schema.danConds)} dc
    WHERE
        dc.parent IS NULL
    UNION ALL
    SELECT
        child.id,
        conds.root,
        child.type,
        child.value,
        child.parent
    FROM
        conds
        JOIN ${getTableName(schema.danConds)} child
        ON child.parent = conds.id
)
SELECT
    *
FROM
    conds
  `

  // TODO deprecate after drizzle supports withRecursive
  #virtualTableDanTreeAlias<T extends string>(name: T) {
    return {
      column: {
        id: sql.raw(`${name}.id`).mapWith(Number),
        root: sql.raw(`${name}.root`).mapWith(Number),
        parent: sql.raw(`${name}.parent`).mapWith(Number),
        type: sql.raw(`${name}.type`),
        value: sql.raw(`${name}.value`),
        truthy: sql.raw(`${name}.truthy`).mapWith(Boolean),
        effectiveType: sql.raw(`${name}.effective_type`),
      },
      aliasedTable: sql.raw(`(${this.#danTreeRecursive}) ${name}`),
      name,
    } as const
  }

  // TODO deprecate after drizzle supports withRecursive
  virtualTableDanTreeSimpleAlias<T extends string>(name: T) {
    return {
      column: {
        id: sql.raw(`${name}.id`).mapWith(Number),
        root: sql.raw(`${name}.root`).mapWith(Number),
        parent: sql.raw(`${name}.parent`).mapWith(Number),
        type: sql.raw(`${name}.type`),
        value: sql.raw(`${name}.value`),
      },
      aliasedTable: sql.raw(`(${this.#danTreeFullSimple}) ${name}`),
      name,
    } as const
  }

  async exportAll(): Promise<DatabaseDan<number, DatabaseRequirementCondBinding<number, Requirement, Cond>>[]> {
    const dans = await this.drizzle.query.dans.findMany({
      with: {
        requirements: {
          columns: {
            condId: true,
            type: true,
          },
        },
      },
    })

    return Promise.all(dans.map(item => this.getDanWithRequirements(item, this.drizzle)))
  }
}

function transformCond(condNode: CondNode): Cond {
  const { type, value, children } = condNode

  switch (type) {
    case OP.AND:
    case OP.OR:
      return {
        type,
        cond: children.map(transformCond),
      }

    case OP.NOT: {
      if (children.length !== 1) {
        throw new Error('\'not\' operator must have exactly one child')
      }
      return {
        type,
        cond: transformCond(children[0]),
      }
    }

    case OP.Remark:
      return {
        type,
        remark: value,
        cond: transformCond(children[0]),
      } as Cond

    case OP.AccGte:
    case OP.BanchoBeatmapIdEq:
    case OP.ScoreGte:
    case OP.StableModIncludeAny:
    case OP.StableModIncludeAll:
      // Leaf condition
      return {
        type,
        val: Number(value),
      }

    case OP.ModeEq:
      return {
        type,
        val: value as Mode,
      }

    case OP.RulesetEq:
      return {
        type,
        val: value as Ruleset,
      }

    case OP.Extends:
      return {
        type,
        val: value as Requirement,
      }

    case OP.BeatmapMd5Eq:
      return {
        type,
        val: value,
      }
    case OP.NoPause:
      return {
        type,
      }

    default:
      assertNotReachable(type)
  }
}

interface CondNode {
  id: number
  type: OP
  value: string
  parent: number
  children: CondNode[]
}

interface DanCondRow {
  id: number
  type: OP
  value: string
  parent: number
}
