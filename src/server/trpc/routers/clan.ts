import { nativeEnum, number, object, string } from 'zod'
import { zodLeaderboardRankingSystem } from '../shapes'
import { router as _router, publicProcedure as p } from '../trpc'
import { userProcedure } from './../middleware/user'
import { Logger } from '$base/logger'
import { type AbnormalStatus, type LocalBeatmapset, type NormalBeatmapWithMeta, type RankingStatus, type ReferencedBeatmapset } from '~/def/beatmap'
import { type LeaderboardRankingSystem } from '~/def/common'
import { Mode, Ruleset } from '~/def'
import { Paginated, type PaginatedResult } from '~/def/pagination'
import type { UserCompact } from '~/def/user'
import { ClanProvider, MapProvider, ScoreProvider, UserProvider, clanProvider } from '~/server/singleton/service'
import type { RankingSystemScore } from '~/def/score'

const logger = Logger.child({ label: 'clan' })

export const router = _router({
  search: p.input(object({
    keyword: string().default(''),
    page: number().min(0).max(5).default(0),
    perPage: number().min(1).max(10).default(10),
    mode: nativeEnum(Mode).default(Mode.Osu),
    ruleset: nativeEnum(Ruleset).default(Ruleset.Standard),
    rankingSystem: zodLeaderboardRankingSystem,
  })).query(({ input }) => {
    return clanProvider.search(input)
  }),
  detail: p.input(object({
    id: string(),
  })).query(async ({ input }) => {
    return mapId(await clanProvider.detail({
      id: ClanProvider.stringToId(input.id),
    }), ClanProvider.idToString)
  }),

  joinedUsers: p.input(object({
    id: string(),
    page: number().default(0),
    perPage: number().default(20),
  })).query(async ({ input }) => {
    const res = await clanProvider.users({
      id: ClanProvider.stringToId(input.id),
      page: input.page,
      perPage: input.perPage,
    })
    return [
      res[Paginated.Count],
      res[Paginated.Data].map(item => mapId(item, ClanProvider.idToString)),
    ] as const satisfies PaginatedResult<UserCompact<string>>
  }),

  bests: p.input(object({
    id: string(),
    mode: nativeEnum(Mode).default(Mode.Osu),
    ruleset: nativeEnum(Ruleset).default(Ruleset.Standard),
    rankingSystem: zodLeaderboardRankingSystem,
    page: number().default(0),
    perPage: number().default(20),
  })).query(async ({ input }) => {
    const res = await clanProvider.bests({
      id: ClanProvider.stringToId(input.id),
      page: input.page,
      perPage: input.perPage,
      mode: input.mode,
      ruleset: input.ruleset,
      rankingSystem: input.rankingSystem,
    })
    return [
      res[Paginated.Count],
      res[Paginated.Data].map((item) => {
        const bm = item.score.beatmap satisfies NormalBeatmapWithMeta<Exclude<RankingStatus, AbnormalStatus>, any, any> as NormalBeatmapWithMeta<Exclude<RankingStatus, AbnormalStatus>, any, any>
        return {
          user: mapId(item.user, UserProvider.idToString),
          score: {
            ...mapId(item.score, ScoreProvider.scoreIdToString),
            beatmap: {
              ...bm,
              beatmapset: (isLocalMapOrMapset(bm)
                ? (mapId(bm.beatmapset, MapProvider.idToString, ['id']) satisfies LocalBeatmapset<string> as LocalBeatmapset<string>)
                : (mapId(bm.beatmapset, MapProvider.idToString, ['id', 'foreignId']) satisfies ReferencedBeatmapset<string, string> as ReferencedBeatmapset<string, string>)),
              status: bm.status,
            } as NormalBeatmapWithMeta<Exclude<RankingStatus, AbnormalStatus>, string, string>,
          },
        }
      }),
    ] satisfies PaginatedResult<{ user: UserCompact<string>; score: RankingSystemScore<string, string, Mode, LeaderboardRankingSystem> }>
  }),

  relation: userProcedure.input(object({
    id: string(),
  })).query(({ input, ctx }) => {
    return clanProvider.getClanRelation({ userId: ctx.user.id, clanId: ClanProvider.stringToId(input.id) })
  }),
  join: userProcedure.input(object({
    id: string(),
  })).mutation(async ({ input, ctx }) => {
    const r = await clanProvider.joinRequest({ userId: ctx.user.id, clanId: ClanProvider.stringToId(input.id) })
    logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> requested to join clan`, { id: input.id, user: pick(ctx.user, ['id', 'name']), status: r })
    return r
  }),
  leave: userProcedure.input(object({
    id: string(),
  })).mutation(async ({ input, ctx }) => {
    const r = await clanProvider.leaveRequest({ userId: ctx.user.id, clanId: ClanProvider.stringToId(input.id) })
    logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> requested to leave clan`, { id: input.id, user: pick(ctx.user, ['id', 'name']), status: r })
    return r
  }),
})
