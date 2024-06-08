import { TRPCError } from '@trpc/server'
import { aliasedTable, and, count, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { type Id, hasRuleset } from '..'
import { config as _config } from '../env'
import { Logger } from '../log'
import {
  type DatabaseUserCompactFields,
  fromBanchoMode,
  idToString,
  stringToId,
  toBanchoPyMode,
  toMods,
  toUserCompact,
} from '../transforms'
import * as schema from '../drizzle/schema'
import { BanchoPyScoreStatus } from '../enums'
import { RedisNotReadyError, client as redisClient } from './source/redis'
import { useDrizzle, userPriv } from './source/drizzle'
import { GucchoError } from '~/def/messages'
import type { ComponentLeaderboard } from '~/def/leaderboard'
import type { ActiveMode, AvailableRuleset, LeaderboardRankingSystem, RankingSystem } from '~/def/common'
import { type Mode, Rank } from '~/def'
import { Monitored } from '$base/server/@extends'
import type { RankProvider as Base } from '$base/server'

const logger = Logger.child({ label: 'leaderboard', backend: 'bancho.py' })

const config = _config()
const drizzle = useDrizzle(schema)

export class DatabaseRankProvider implements Base<Id> {
  static readonly stringToId = stringToId
  static readonly idToString = idToString

  drizzle = drizzle
  config = config

  async leaderboard<M extends ActiveMode, RS extends LeaderboardRankingSystem>({
    mode,
    ruleset,
    rankingSystem,
    page,
    pageSize,
  }: {
    mode: M
    ruleset: AvailableRuleset<M>
    rankingSystem: RS
    page: number
    pageSize: number
  }): Promise<ComponentLeaderboard<Id>[]> {
    const start = page * pageSize

    const result = await this.drizzle
      .select({
        user: pick(schema.users, ['id', 'country', 'name', 'safeName', 'priv'] satisfies DatabaseUserCompactFields[]),
        stat: pick(schema.stats, ['pp', 'rankedScore', 'totalScore', 'accuracy', 'plays']),
      })
      .from(schema.stats)
      .innerJoin(schema.users, eq(schema.stats.id, schema.users.id))
      .where(
        and(
          userPriv(schema.users),
          rankingSystem === Rank.PPv2 ? gt(schema.stats.pp, 0) : undefined,
          rankingSystem === Rank.RankedScore ? gt(schema.stats.rankedScore, 0n) : undefined,
          rankingSystem === Rank.TotalScore ? gt(schema.stats.totalScore, 0n) : undefined,
          eq(schema.stats.mode, toBanchoPyMode(mode, ruleset)),
        )
      )
      .orderBy(
        rankingSystem === Rank.PPv2
          ? desc(schema.stats.pp)
          : rankingSystem === Rank.RankedScore
            ? desc(schema.stats.rankedScore)
            : rankingSystem === Rank.TotalScore
              ? desc(schema.stats.totalScore)
              : throwGucchoError(GucchoError.ModeNotSupported)
      )
      .limit(pageSize)
      .offset(start)

    return result.map(({ user, stat }, index) => ({
      user: toUserCompact(user, this.config),
      inThisLeaderboard: {
        [Rank.PPv2]: stat.pp,
        [Rank.RankedScore]: stat.rankedScore,
        [Rank.TotalScore]: stat.totalScore,
        accuracy: stat.accuracy,
        playCount: stat.plays,
        rank: BigInt(start + index + 1),
      },
    }) satisfies ComponentLeaderboard<Id>)
  }

  async countLeaderboard(query: Base.BaseQuery<Mode> & { rankingSystem: LeaderboardRankingSystem }) {
    const { mode, ruleset, rankingSystem } = query
    const c = await this.drizzle.select({
      count: sql`COUNT(*)`.mapWith(Number),
    }).from(schema.stats)
      .innerJoin(schema.users, eq(schema.users.id, schema.stats.id))
      .where(
        and(
          ...[
            rankingSystem === Rank.PPv2 ? gt(schema.stats.pp, 0) : undefined,
            rankingSystem === Rank.RankedScore ? gt(schema.stats.rankedScore, 0n) : undefined,
            rankingSystem === Rank.TotalScore ? gt(schema.stats.totalScore, 0n) : undefined,
            eq(schema.stats.mode, toBanchoPyMode(mode, ruleset)),
            userPriv(schema.users),
          ].filter(TSFilter)
        )
      )

    return c[0].count
  }

  async determineBeatmapMode(md5: string) {
    const q = await this.drizzle.query.beatmaps.findFirst({
      columns: {
        mode: true,
      },
      where: eq(schema.beatmaps.md5, md5),
    }) ?? raise(TRPCError, { message: 'beatmap not found', code: 'NOT_FOUND' })
    return fromBanchoMode(q.mode)
  }

  async beatmap(
    query: Base.BaseQueryOptionalMode & Base.Pagination & {
      rankingSystem: RankingSystem
      md5: string
    },
  ) {
    const { ruleset, rankingSystem, md5 } = query
    let { mode } = query
    if (!mode) {
      mode = await this.determineBeatmapMode(md5)
    }
    if (!hasRuleset(mode, ruleset)) {
      return []
    }

    const s = aliasedTable(schema.scores, 's')
    const u = aliasedTable(schema.users, 'u')
    const _q = this.drizzle.select({
      score: s,
      user: pick(u, ['country', 'id', 'name', 'priv', 'safeName'] satisfies DatabaseUserCompactFields[]),
    }).from(s)
      .innerJoin(u, eq(s.userId, u.id))
      .where(and(
        eq(s.mapMd5, md5),
        userPriv(u),
        eq(s.mode, toBanchoPyMode(mode, ruleset)),
        eq(s.status, BanchoPyScoreStatus.Pick)
      ))

    let q
    if (rankingSystem === 'score') {
      q = _q.orderBy(desc(s.score))
    }
    else if (rankingSystem === Rank.PPv2) {
      q = _q.orderBy(desc(s.pp))
    }
    else {
      return []
    }

    const res = await q

    return res.map(({ score, user }, index) => ({
      user: toUserCompact(user, this.config),
      score: {
        id: score.id.toString(),
        [Rank.PPv2]: score.pp,
        accuracy: score.accuracy,
        score: score.score,
        playedAt: score.playTime,
        mods: toMods(score.mods),
      },
      rank: index,
    }))
  }

  async countBeatmap(query: Base.BaseQueryOptionalMode<Mode> & { rankingSystem: RankingSystem; md5: string }): Promise<number> {
    const { ruleset, rankingSystem, md5 } = query
    let { mode } = query
    if (!mode) {
      mode = await this.determineBeatmapMode(md5)
    }
    if (!hasRuleset(mode, ruleset)) {
      return 0
    }

    const s = await this.drizzle.select({
      count: sql`COUNT(*)`.mapWith(Number),
    })
      .from(schema.scores)
      .innerJoin(schema.users, eq(schema.scores.userId, schema.users.id))
      .innerJoin(schema.beatmaps, eq(schema.scores.mapMd5, schema.beatmaps.md5))
      .where(and(
        ...[
          rankingSystem === Rank.PPv2 ? gt(schema.scores.pp, 0) : undefined,
          rankingSystem === Rank.Score ? gt(schema.scores.score, 0) : undefined,
          eq(schema.beatmaps.md5, md5),
          userPriv(schema.users),
          eq(schema.scores.mode, toBanchoPyMode(mode, ruleset)),
          eq(schema.scores.status, BanchoPyScoreStatus.Pick),
        ].filter(TSFilter)
      ))

    return s[0].count
  }
}

export class RedisRankProvider extends DatabaseRankProvider implements Monitored {
  redisClient = redisClient()

  get [Monitored.status](): Monitored[typeof Monitored.status] {
    return this.redisClient?.isReady ? [Monitored.Status.Up, 'Providing Realtime data 🔥'] : [Monitored.Status.Degraded, 'Leaderboards may differ from real results.']
  }

  async getPPv2LiveLeaderboard(
    banchoPyMode: number,
    start: number,
    end: number,
    country?: string,
  ) {
    if (this.redisClient?.isReady) {
      return await this.redisClient.zRange(
        country
          ? `bancho:leaderboard:${banchoPyMode}:${country}`
          : `bancho:leaderboard:${banchoPyMode}`,
        '+inf',
        1,
        {
          BY: 'SCORE',
          REV: true,
          LIMIT: {
            offset: start,
            count: end,
          },
        },
      )
    }
    raise(RedisNotReadyError, 'redis is not ready')
  }

  async countLeaderboard(query: Base.BaseQuery<Mode> & { rankingSystem: LeaderboardRankingSystem }): Promise<number> {
    const { mode, ruleset, rankingSystem } = query

    if (!this.redisClient.isReady || rankingSystem !== Rank.PPv2) {
      return super.countLeaderboard(query)
    }

    try {
      const bPyMode = toBanchoPyMode(mode, ruleset)
      if (bPyMode === undefined) {
        raise(Error, 'no mode')
      }
      // TODO: banned players are included
      const rank = await this.getPPv2LiveLeaderboard(
        bPyMode,
        0,
        500,
      ).then(res => res.map(Number))

      if (!rank.length) {
        raise(RedisRankProvider.RedisNoDataError, 'redis leaderboard is empty, fallback to database..')
      }

      const res = await this.drizzle.select({ count: count() })
        .from(schema.stats)
        .where(
          and(
            inArray(schema.stats.id, rank),
            eq(schema.stats.mode, bPyMode),
            gt(schema.stats.pp, 0)
          )
        )

      return res[0].count
    }
    catch (e) {
      switch (true) {
        case e instanceof RedisRankProvider.RedisNoDataError: {
          logger.info(e)
          break
        }
        case e instanceof RedisNotReadyError: {
          logger.warn(e)
          break
        }
        default: {
          logger.error(e)
        }
      }
      return super.countLeaderboard(query)
    }
  }

  async leaderboard<M extends ActiveMode, RS extends LeaderboardRankingSystem>({
    mode,
    ruleset,
    rankingSystem,
    page,
    pageSize,
  }: {
    mode: M
    ruleset: AvailableRuleset<M>
    rankingSystem: RS
    page: number
    pageSize: number
  }): Promise<ComponentLeaderboard<Id>[]> {
    if (!this.redisClient.isReady || rankingSystem !== Rank.PPv2) {
      return super.leaderboard({ mode, ruleset, rankingSystem, page, pageSize })
    }

    try {
      const start = page * pageSize
      const bPyMode = toBanchoPyMode(mode, ruleset)

      // user.id[]
      const rank = await this.getPPv2LiveLeaderboard(bPyMode, 0, start + pageSize * 2).then(res => res.map(Number))

      if (!rank.length) {
        return super.leaderboard({ mode, ruleset, rankingSystem, page, pageSize })
      }

      const uStats = await this.drizzle.select({
        users: {
          id: schema.users.id,
          name: schema.users.name,
          safeName: schema.users.safeName,
          priv: schema.users.priv,
          country: schema.users.country,
        },

        stats: {
          [Rank.PPv2]: schema.stats.pp,
          [Rank.TotalScore]: schema.stats.totalScore,
          [Rank.RankedScore]: schema.stats.rankedScore,
          accuracy: schema.stats.accuracy,
          plays: schema.stats.plays,
        },
      })
        .from(schema.users)
        .innerJoin(schema.stats, and(
          eq(schema.users.id, schema.stats.id)),
        )
        .where(and(
          eq(schema.stats.mode, bPyMode),
          userPriv(schema.users),
          inArray(schema.users.id, rank)
        ))
        .orderBy(sql`FIELD(${schema.users.id}, ${sql.raw(rank.join(', '))})` /* MySQL / MariaDB */)
        .offset(start)
        .limit(pageSize)

      const result: ComponentLeaderboard<Id>[] = uStats.map(({ stats: stat, users: user }, index) => ({
        user: toUserCompact(user, this.config),
        inThisLeaderboard: {
          [Rank.PPv2]: stat[Rank.PPv2],
          [Rank.TotalScore]: stat[Rank.TotalScore],
          [Rank.RankedScore]: stat[Rank.RankedScore],
          accuracy: stat.accuracy,
          playCount: stat.plays,
          // rank: item._rank,
          // order is correct but rank contains banned user, since we didn't check user priv before when selecting count.
          // calculate rank based on page size * index of this page.
          rank: start + index + 1,
        },
      }))

      if (!result.length) {
        return super.leaderboard({ mode, ruleset, rankingSystem, page, pageSize })
      }

      return result
    }
    catch (e) {
      logger.error(e)
      return super.leaderboard({ mode, ruleset, rankingSystem, page, pageSize })
    }
  }
}

export namespace RedisRankProvider {
  export class RedisNoDataError extends Error { name = 'RedisNoDataError' }
}

function reveal() {
  switch (config.leaderboardSource) {
    case 'database': {
      return DatabaseRankProvider
    }
    case 'redis': {
      return RedisRankProvider
    }
  }
}

export const RankProvider = reveal()
