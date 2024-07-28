import { and, asc, desc, eq, notInArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/mysql-core'
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
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, Requirement } from '~/def/dan'
import { DanProvider as Base } from '$base/server'
import { validateCond } from '~/common/utils/dan'

export class DanProvider extends Base<Id, ScoreId> {
  static readonly idToString = idToString
  static readonly stringToId = stringToId

  static readonly stringToScoreId = stringToScoreId
  static readonly scoreIdToString = scoreIdToString

  drizzle = useDrizzle(schema)
  async get(id: Id, tx: typeof this.drizzle = this.drizzle): Promise<DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>> {
    const i = await tx.query.dans.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, id)
      },
      with: {
        requirements: {
          with: {
            cond: true,
          },
        },
      },
      orderBy: dan => asc(dan.id),
    }) ?? throwGucchoError(GucchoError.DanNotFound)

    return {
      ...i,
      description: i.description ?? '',
      requirements: i.requirements.map(i => ({
        ...i,
        id: i.cond.id,
        type: i.type === 'pass' ? Requirement.Pass : Requirement.NoPause,
        cond: i.cond.cond as Cond,
      })),
    }
  }

  async delete(id: number): Promise<void> {
    await this.drizzle.transaction(async (tx) => {
      await tx.delete(schema.requirementCondBindings).where(eq(schema.requirementCondBindings.danId, id))
      await tx.delete(schema.dans).where(eq(schema.dans.id, id))
      await this.removeDangling(tx)
    })
  }

  async search(a: { keyword: string; page: Id; perPage: Id }): Promise<DatabaseDan<Id>[]> {
    const f = await this.drizzle.query.dans.findMany({
      where(fields, operators) {
        return operators.or(
          operators.like(fields.name, `%${a.keyword}%`),
          operators.like(fields.description, `%${a.keyword}%`),
        )
      },
      with: {
        requirements: {
          with: {
            cond: true,
          },
        },
      },
      limit: a.perPage,
      offset: a.page * a.perPage,
      orderBy: dan => desc(dan.id),
    })

    return f.map((i) => {
      return {
        ...i,
        description: i.description ?? '',
        requirements: i.requirements.map(i => ({
          ...i,
          id: i.cond.id,
          type: i.type === 'pass' ? Requirement.Pass : Requirement.NoPause,
          cond: i.cond.cond as Cond,
        })),
      }
    }) satisfies DatabaseDan<Id>[]
  }

  async clearedScores(a: Id) {
    const data = await this.drizzle.select({
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
      .where(({ dan }) => eq(dan.id, a))
      .limit(100)

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

  tbl = {
    users: schema.users,
    scores: schema.scores,
    beatmaps: schema.beatmaps,
    sources: schema.sources,
  }

  _sql = this.drizzle.select({
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
          scores: await this._sql.where(
            and(
              eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
              danSQLChunks(a.cond, opt.requirements, this.tbl),
            )
          ).execute(),
        })
      )
    )
  }

  async saveComposed(i: Dan | DatabaseDan<Id>, u: UserCompact<Id>): Promise<DatabaseDan<number, DatabaseRequirementCondBinding<number, Requirement, Cond>>> {
    return await this.drizzle.transaction(async (tx) => {
      const [result] = await tx
        .insert(schema.dans)
        .values({
          id: 'id' in i ? i.id : undefined,
          name: i.name,
          description: i.description,
          creator: u.id,
          updater: u.id,
        }).onDuplicateKeyUpdate({
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

      await tx.delete(schema.requirementCondBindings)
        .where(
          and(
            eq(schema.requirementCondBindings.danId, id),
          )
        )

      for (const r of i.requirements) {
        r.cond = validateCond(r.cond)
        const [res] = await tx
          .insert(schema.danConds)
          .values({
            id: 'id' in r ? r.id : undefined,
            cond: r.cond,
            updater: u.id,
            creator: u.id,
          }).onDuplicateKeyUpdate({
            set: {
              updater: u.id,
              cond: r.cond,
            },
          })

        const rid = (r as DatabaseRequirementCondBinding<Id, Requirement, Cond>).id ?? res.insertId

        if (!rid) {
          throw new Error(`Failed to save cond: ${JSON.stringify(r.cond)}`)
        }

        await tx.insert(schema.requirementCondBindings)
          .values({
            danId: id,
            condId: rid,
            type: r.type === Requirement.NoPause ? 'no-pause' : 'pass',
          })
      }
      await this.removeDangling(tx)

      return await this.get(id, tx)
    }).catch((e) => {
      console.error(e)
      throw e
    })
  }

  async removeDangling(tx: typeof this.drizzle = this.drizzle) {
    const dc2 = alias(schema.danConds, 'dc2')
    const sq = tx.select({ id: dc2.id }).from(schema.requirementCondBindings)
      .innerJoin(dc2, eq(schema.requirementCondBindings.condId, dc2.id))

    return tx.delete(schema.danConds)
      .where(notInArray(schema.danConds.id, tx.select().from(sq.as('sq')))).catch(e => console.error(e))
  }
}
