import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
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
import { type Mode } from '~/def'

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

    const built = await this.buildCondTree(rootCondIds, tx)

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

  async buildCondTree(ids: Id[], tx: Omit<typeof this.drizzle, '$client'>): Promise<Record<Id, Cond>> {
    // Fetch all conditions starting from rootCondIds using a recursive CTE
    const [conditionsResult] = await tx.execute(
      sql`
      WITH RECURSIVE cond_tree AS (
        SELECT id, type, value, parent
        FROM ${schema.danConds}
        WHERE id IN (${ids})
        UNION ALL
        SELECT dc.id, dc.type, dc.value, dc.parent
        FROM ${schema.danConds} dc
        INNER JOIN cond_tree ct ON dc.parent = ct.id
      )
      SELECT id, type, value, parent
      FROM cond_tree;
    `
    )

    // Build a map of conditions by id
    const condMap = new Map<number, CondNode>()
    for (const row of conditionsResult as unknown as DanCondRow[]) {
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
      const f = await tx.query.dans.findMany({
        where(fields, operators) {
          return operators.or(
            operators.like(fields.name, `%${a.keyword}%`),
            operators.like(fields.description, `%${a.keyword}%`),
          )
        },
        with: {
          requirements: {
            columns: {
              condId: true,
              type: true,
            },
          },
        },
        limit: a.perPage,
        offset: a.page * a.perPage,
        orderBy: dan => desc(dan.id),
      })

      return await Promise.all(f.map(i => this.getDanWithRequirements(i, tx))) satisfies DatabaseDan<Id>[]
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
  ): Promise<DatabaseDan<number, DatabaseRequirementCondBinding<number, Requirement, Cond>>> {
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
            type: r.type === Requirement.NoPause ? 'no-pause' : 'pass',
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
            parent: parentId ?? 0,
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
            parent: parentId ?? 0,
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
            parent: parentId ?? 0,
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
            parent: parentId ?? 0,
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
            parent: parentId ?? 0,
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
  // Use a recursive CTE to find all descendant condition IDs
    const [conditionsToDeleteResult] = await tx.execute(
      sql`
      WITH RECURSIVE cond_tree AS (
        SELECT id
        FROM ${schema.danConds}
        WHERE id = ${condId}
        UNION ALL
        SELECT dc.id
        FROM ${schema.danConds} dc
        INNER JOIN cond_tree ct ON dc.parent = ct.id
      )
      SELECT id FROM cond_tree
    `
    )

    const condIdsToDelete = (conditionsToDeleteResult as unknown as { id: number }[]).map(row => row.id)

    // Delete the conditions
    if (condIdsToDelete.length > 0) {
      await tx
        .delete(schema.danConds)
        .where(inArray(schema.danConds.id, condIdsToDelete))
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

    case OP.Extends:
      return {
        type,
        val: Number(value) as Requirement,
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
