import { aliasedTable, and, asc, desc, eq, getTableName, inArray, like, or, sql } from 'drizzle-orm'
import type { Id, ScoreId } from '../'
import { BanchoPyScoreStatus } from '../../bancho.py/enums'
import { useDrizzle } from '../../bancho.py/server/source/drizzle'
import {
  fromBanchoPyMode,
  idToString,
  scoreIdToString,
  stringToId,
  stringToScoreId,
  toScore,
} from '../../bancho.py/transforms'
import * as schema from '../drizzle/schema'
import { danSQLChunks } from '~/server/common/sql-dan'
import { type UserCompact } from '~/def/user'
import { GucchoError } from '~/def/messages'
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, OP, Requirement } from '~/def/dan'
import { DanProvider as Base } from '$base/server'
import { validateCond } from '~/common/utils/dan'
import { type Mode, type Ruleset } from '~/def'

export class DanProvider extends Base<Id, ScoreId> {
  static readonly idToString = idToString
  static readonly stringToId = stringToId

  static readonly stringToScoreId = stringToScoreId
  static readonly scoreIdToString = scoreIdToString

  drizzle = useDrizzle(schema)
  async get(
    id: Id,
  tx: Omit<typeof this.drizzle, '$client'> = this.drizzle
  ): Promise<DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>> {
    // const q2 = await tx.select()
    //   .from(schema.dans)
    //   .innerJoin(schema.requirementCondBindings, eq(schema.dans.id, schema.requirementCondBindings.danId))
    //   .where(
    //     eq(schema.dans.id, id)
    //   )
    // Fetch the dan record
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
    id: number
    name: string
    creator: number | null
    createdAt: Date
    description: string | null
    updater: number | null
    updatedAt: Date
    requirements: {
      type: 'pass' | 'no-pause'
      condId: number
    }[]
  },
  tx: Omit<typeof this.drizzle, '$client'> = this.drizzle
  ) {
    // Extract root condition IDs from requirements
    const rootCondIds = dan.requirements.map(r => r.condId)

    const built = await this.fetchAndBuildCondTree(rootCondIds, tx)

    const requirementsWithConds = dan.requirements.map((req) => {
      const cond = built[req.condId]
      if (!cond) {
        throw new Error(`Root condition with id ${req.condId} not found`)
      }
      return {
        ...req,
        id: req.condId,
        type: req.type === 'pass' ? Requirement.Pass : Requirement.NoPause,
        cond,
      }
    })

    return {
      ...dan,
      description: dan.description ?? '',
      requirements: requirementsWithConds,
    }
  }

  async fetchAndBuildCondTree(ids: Id[], tx: Omit<typeof this.drizzle, '$client'>): Promise<Record<Id, Cond>> {
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

  async delete(id: number): Promise<void> {
    await this.drizzle.transaction(async (tx) => {
      await tx.delete(schema.requirementCondBindings).where(eq(schema.requirementCondBindings.danId, id))
      await tx.delete(schema.dans).where(eq(schema.dans.id, id))
    })
  }

  async search(a: { keyword: string; page: Id; perPage: Id }): Promise<DatabaseDan<Id>[]> {
    return this.drizzle.transaction(async (tx) => {
      const recursiveCond = this.#virtualTableDanTreeAlias('cond_tree')

      const bmId = aliasedTable(schema.beatmaps, 'b_id')
      const bmMd5 = aliasedTable(schema.beatmaps, 'b_md5')

      const result = await tx.selectDistinct({
        id: schema.dans.id,
      })
        .from(schema.dans)
        .innerJoin(schema.requirementCondBindings, eq(schema.dans.id, schema.requirementCondBindings.danId))
        .innerJoin(recursiveCond.aliasedTable, eq(recursiveCond.column.root, schema.requirementCondBindings.condId))
        // cannot use OR here because it will prevent index usage.
        .leftJoin(bmId, and(eq(recursiveCond.column.type, OP.BanchoBeatmapIdEq), eq(bmId.id, recursiveCond.column.value), eq(bmId.server, 'osu!')))
        .leftJoin(bmMd5, and(eq(recursiveCond.column.type, OP.BeatmapMd5Eq), eq(bmMd5.md5, recursiveCond.column.value)))
        .where(
          or(
            // search name
            like(schema.dans.name, `%${a.keyword}%`),
            // search description
            like(schema.dans.description, `%${a.keyword}%`),

            // search conditions
            and(
              // must be truthy conditions
              eq(recursiveCond.column.truthy, 1),

              or(
              // mode eq 'mania'
              // bancho beatmap id eq
              // beatmap md5 eq
                and(
                  inArray(recursiveCond.column.type, [
                    OP.ModeEq,
                    OP.BanchoBeatmapIdEq,
                    OP.BeatmapMd5Eq,
                  ]),
                  eq(recursiveCond.column.value, a.keyword),
                ),

                // further search matched beatmaps
                or(
                  like(bmId.artist, `%${a.keyword}%`),
                  like(bmId.title, `%${a.keyword}%`),
                  like(bmId.creator, `%${a.keyword}%`),
                  like(bmMd5.artist, `%${a.keyword}%`),
                  like(bmMd5.title, `%${a.keyword}%`),
                  like(bmMd5.creator, `%${a.keyword}%`),
                ),
              )
            ),

          )
        )
        .limit(a.perPage)
        .offset(a.page * a.perPage)

      const dans = await tx.query.dans
        .findMany({
          where: inArray(schema.dans.id, result.map(({ id }) => id)),
          with: {
            requirements: true,
          },
        })

      return Promise.all(dans.map(d => this.getDanWithRequirements(d, tx)))
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
    .innerJoin(schema.requirementCondBindings, eq(schema.requirementClearedScores.requirement, schema.requirementCondBindings.id))
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

  async getQualifiedScores(id: Id): Promise<Base.RequirementQualifiedScore<Id, ScoreId>[]> {
    const dan = await this.get(id)

    const res = await this.runCustomDan(dan)
    return res
  }

  readonly tbl = {
    users: schema.users,
    scores: schema.scores,
    beatmaps: schema.beatmaps,
    sources: schema.sources,
  }

  readonly #runCustomDanSql = this.drizzle.select({
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
    // .innerJoin(this.tbl.sources, and(
    //   eq(this.tbl.beatmaps.server, this.tbl.sources.server),
    //   eq(this.tbl.beatmaps.setId, this.tbl.sources.id),
    // ))
    .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))
    .orderBy(desc(this.tbl.scores.score))
    .limit(10)

  async runCustomDan(opt: Dan): Promise<Array<Base.RequirementQualifiedScore<Id, ScoreId>>> {
    return await Promise.all(
      opt.requirements.map(
        async a => ({
          requirement: a.type,
          scores: await this.#runCustomDanSql.where(
            and(
              eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
              danSQLChunks(a.cond, opt.requirements, this.tbl),
            )
          ).execute(),
        })
      )
    )
  }

  async saveComposed(
    i: Dan | DatabaseDan<Id>,
    u: UserCompact<Id>
  ): Promise<DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>> {
    return await this.drizzle.transaction(async (tx) => {
    // 1. Insert or update the dan record
      const [result] = await tx
        .insert(schema.dans)
        .values({
          id: 'id' in i ? i.id : undefined,
          name: i.name,
          description: i.description,
          creator: u.id,
          updater: u.id,
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

      // Delete existing requirement bindings
      await tx
        .delete(schema.requirementCondBindings)
        .where(eq(schema.requirementCondBindings.danId, id))

      // Delete old conditions recursively
      for (const oldCondId of oldCondIds) {
        await this.deleteCondNodeWithChildren(oldCondId, tx)
      }

      // 3. Save new conditions and their tree structures
      for (const r of i.requirements) {
      // Validate the condition
        r.cond = validateCond(r.cond)

        // Recursively save the condition tree and get the root condition ID
        const rootCondId = await this.saveCondTree(r.cond, tx, null)

        if (!rootCondId) {
          throw new Error(`Failed to save cond: ${JSON.stringify(r.cond)}`)
        }

        // 4. Link the root condition to the dan via requirement_cond_bindings
        await tx
          .insert(schema.requirementCondBindings)
          .values({
            danId: id,
            condId: rootCondId,
            type: r.type,
          })
      }

      // 5. Return the updated dan object
      return await this.get(id, tx)
    }).catch((e) => {
      console.error(e)
      throw e
    })
  }

  private async saveCondTree(
    cond: Cond,
    tx: Omit<typeof this.drizzle, '$client'>,
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
          case OP.WithStableMod:
          case OP.Extends:
            valueStr = cond.val.toString()
            break
          case OP.ModeEq:
            valueStr = cond.val as string
            break
          case OP.BeatmapMd5Eq:
            valueStr = cond.val
            break
          default:
            throw new Error(`Unsupported condition type ${(cond as any).type}`)
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

  private async deleteCondNodeWithChildren(condId: number, tx: Omit<typeof this.drizzle, '$client'>): Promise<void> {
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
    -- Modified CTE with value_int
    SELECT
        dc.id,
        dc.id AS root,
        dc.type,
        dc.value,
        -- CASE
        --     WHEN dc.type = 'bancho-bm-id-eq'
        --     AND dc.value REGEXP '^[0-9]+$' THEN CONVERT(
        --         dc.value,
        --         UNSIGNED
        --     )
        --     ELSE NULL
        -- END AS value_int,
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
        -- CASE
        --     WHEN child.type = 'bancho-bm-id-eq'
        --     AND child.value REGEXP '^[0-9]+$' THEN CONVERT(
        --         child.value,
        --         UNSIGNED
        --     )
        --     ELSE NULL
        -- END AS value_int,
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

  // TODO deprecate after drizzle supports withRecursive
  #virtualTableDanTreeAlias(name: string) {
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
    }
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

    case OP.NOT:{
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
    case OP.WithStableMod:
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
