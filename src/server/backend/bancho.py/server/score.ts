import { and, desc, eq, sql } from 'drizzle-orm'
import type { Id } from '..'
import * as schema from '../drizzle/schema'
import { config as _config } from '../env'
import {
  type AbleToTransformToScores,
  type DatabaseUserCompactFields,
  fromBanchoPyMode,
  idToString,
  scoreIdToString,
  stringToId,
  stringToScoreId,
  toBanchoPyMode,
  toScore,
  toUserCompact,
} from '../transforms'
import { BanchoPyScoreStatus } from '../enums'
import { useDrizzle } from './source/drizzle'
import { GucchoError } from '~/def/messages'
import type {
  ScoreProvider as Base,
} from '$base/server'
import { type Mode, type Rank, type Ruleset } from '~/def'
import { type Achievement, type AchievementBinding, type Cond, type Usecase } from '~/def/dan'
import { danSQLChunks } from '~/server/common/sql-dan'

const config = _config()
const drizzle = useDrizzle(schema)
export class ScoreProvider implements Base<bigint, Id> {
  static readonly idToString = idToString
  static readonly stringToId = stringToId

  static readonly stringToScoreId = stringToScoreId
  static readonly scoreIdToString = scoreIdToString

  drizzle = drizzle
  config = config

  #transformScore(dbScore: AbleToTransformToScores & { user: Pick<typeof schema.users['$inferSelect'], DatabaseUserCompactFields> }) {
    const [mode, ruleset] = fromBanchoPyMode(dbScore.score.mode)
    return Object.assign(
      toScore({
        ...dbScore,
        mode,
        ruleset,
      }),
      { user: toUserCompact(dbScore.user, this.config) },
    )
  }

  async id(id: bigint) {
    const result = await this.drizzle.query.scores.findFirst({
      where: eq(schema.scores.id, id),
      with: {
        user: true,
        beatmap: {
          with: {
            source: true,
          },
        },
      },
    }) ?? raise(Error, 'score not found')

    return this.#transformScore({ score: result, beatmap: result.beatmap, source: result.beatmap.source, user: result.user })
  }

  #getQuery(opt: Omit<Base.SearchQuery<Id>, 'rankingSystem'>) {
    const { user, beatmap, mode, ruleset } = opt

    return this.drizzle
      .select({
        score: schema.scores,
        user: schema.users,
        clan: schema.clans,
        beatmap: schema.beatmaps,
        source: schema.sources,
      }).from(schema.scores)
      .innerJoin(schema.beatmaps, eq(schema.beatmaps.md5, schema.scores.mapMd5))
      .innerJoin(schema.sources, and(eq(schema.beatmaps.server, schema.sources.server), eq(schema.beatmaps.setId, schema.sources.id)))
      .innerJoin(schema.users, eq(schema.scores.userId, schema.users.id))
      .leftJoin(schema.clans, eq(schema.users.clanId, schema.clans.id))
      .where(
        and(
          user
            ? and(
              user.clan
                ? and(
                  user.clan.id ? eq(schema.clans.id, user.clan.id) : undefined,
                  user.clan.name ? eq(schema.clans.name, user.clan.name) : undefined,
                  user.clan.badge ? eq(schema.clans.badge, user.clan.badge) : undefined
                )
                : undefined,
              user.flag ? eq(schema.users.country, user.flag) : undefined,
              user.name ? eq(schema.users.name, user.name) : undefined,
              user.safeName ? eq(schema.users.safeName, user.safeName) : undefined,
              user.id ? eq(schema.users.id, user.id) : undefined,
            )
            : undefined,

          beatmap?.id
            ? eq(schema.beatmaps.id, beatmap.id)
            : undefined,

          eq(schema.scores.mode, toBanchoPyMode(mode, ruleset)),
        )
      ).$dynamic()
  }

  async findOne(opt: Omit<Base.SearchQuery<Id>, 'rankingSystem'>) {
    const [res] = await this.#getQuery(opt).limit(1)

    if (!res) {
      throwGucchoError(GucchoError.ScoreNotFound)
    }
    return this.#transformScore(res)
  }

  async findMany(opt: Omit<Base.SearchQuery<Id>, 'rankingSystem'>) {
    const scores = await this.#getQuery(opt).limit(20)

    return scores.map(this.#transformScore).filter(TSFilter)
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
    },
  })
    .from(this.tbl.scores)
    .innerJoin(this.tbl.beatmaps, eq(this.tbl.scores.mapMd5, this.tbl.beatmaps.md5))
    .innerJoin(this.tbl.sources, and(
      eq(this.tbl.beatmaps.server, this.tbl.sources.server),
      eq(this.tbl.beatmaps.setId, this.tbl.sources.id),
    ))
    .innerJoin(this.tbl.users, eq(this.tbl.scores.userId, this.tbl.users.id))
    .orderBy(desc(this.tbl.scores.score))
    .limit(10)

  async runCustomAchievement(opt: Usecase<AchievementBinding<Achievement, Cond>>): Promise<Array<{
    achievement: Achievement
    cond: Cond
    results: {
      player: {
        id: Id
        name: string
      }
      score: {
        id: bigint
        accuracy: number
        score: number
      }
      beatmap: {
        id: Id
        md5: string
        artist: string
        title: string
      }
    }[]
  }>> {
    return await Promise.all(
      opt.achievements.map(
        async a => ({
          achievement: a.achievement,
          cond: a.cond,
          results: await this._sql.where(
            and(
              eq(this.tbl.scores.status, BanchoPyScoreStatus.Pick),
              danSQLChunks(a.cond, opt.achievements, this.tbl),
            )
          ),
        })
      )
    )
  }
}
