import { type ZodSchema, any, boolean, nativeEnum, number, object, string } from 'zod'
import { type DanProvider as BaseDanProvider } from '../../backend/$base/server'
import { staffProcedure } from '../middleware/role'
import { router as _router, publicProcedure } from '../trpc'
import { zodMode, zodRuleset } from '../shapes'
import { validateUsecase } from '~/common/utils/dan'
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, Requirement } from '~/def/dan'
import { Feature } from '~/def/features'
import { DanProvider, ScoreProvider, UserProvider, dans } from '~/server/singleton/service'

export const router = _router({
  search: publicProcedure
    .input(object({
      keyword: string(),
      mode: zodMode.optional(),
      ruleset: zodRuleset.optional(),
      rulesetDefaultsToStandard: boolean().optional().default(false),
      page: number().min(0).max(5).default(0),
      perPage: number().min(1).max(10).default(10),
    }))
    .query(async ({ input }) => {
      const searchResult = await dans.search(input)
      return searchResult.map(i => ({
        ...i,
        id: DanProvider.idToString(i.id),
        creator: i.creator ? UserProvider.idToString(i.creator) : undefined,
        updater: i.updater ? UserProvider.idToString(i.updater) : undefined,
        requirements: i.requirements.map(i => ({
          ...i,
        })) satisfies DatabaseRequirementCondBinding<string, Requirement, Cond>[],
      })) satisfies DatabaseDan<string>[]
    }),

  get: withFeatureFlag(publicProcedure, Feature.Dan)
    .input(string())
    .query(async ({ input }) => {
      const res = await dans.get(DanProvider.stringToId(input))
      return transformDan(res)
    }),

  delete: withFeatureFlag(staffProcedure, Feature.Dan)
    .input(string())
    .mutation(async ({ input }) => await dans.delete(DanProvider.stringToId(input))),

  save: withFeatureFlag(staffProcedure, Feature.Dan)
    .input(
      any()
        .refine((i): i is DatabaseDan<string> => !!validateUsecase(i as DatabaseDan<string>)) as ZodSchema<DatabaseDan<string>>
    )
    .mutation(async ({ input, ctx }) => {
      const i = await dans.saveComposed({
        ...input,
        id: input.id ? DanProvider.stringToId(input.id) : undefined,
        requirements: input.requirements,
      }, ctx.user)
      return {
        ...i,
        id: DanProvider.idToString(i.id),
        requirements: i.requirements,
      }
    }),

  // scores: publicProcedure
  //   .input(object({
  //     id: string(),
  //     page: number().min(0).max(5).default(0),
  //     perPage: number().min(1).max(10).default(10),
  //   }))
  //   .query(async ({ input }) => {
  //     return dans.scores(input)
  //   }),

  userRule: withFeatureFlag(publicProcedure, Feature.Dan)
    .input(any().refine((i): i is Dan => validateUsecase(i))).query(async ({ input }) => {
      const result = await dans.runCustomDan(input)
      return result.map(i => ({
        ...i,
        scores: i.scores.map(s => ({
          ...s,
          score: {
            ...s.score,
            id: ScoreProvider.scoreIdToString(s.score.id),
          },
        })),
      }))
    }),

  getQualifiedScores: withFeatureFlag(publicProcedure, Feature.Dan)
    .input(object({
      id: string(),
      requirement: nativeEnum(Requirement),
      page: number().min(0).max(5).default(0),
      perPage: number().min(1).max(10).default(10),
    })).query(async ({ input }) => {
      const result = await dans.getQualifiedScores(DanProvider.stringToId(input.id), input.requirement, input.page, input.perPage)

      return ({
        count: result.count,
        scores: result.scores.map(s => ({
          ...s,
          score: mapId(s.score, ScoreProvider.scoreIdToString),
          player: mapId(s.player, DanProvider.idToString),
          beatmap: mapId(s.beatmap, DanProvider.idToString),
        })) as BaseDanProvider.QualifiedScore<string, string>[],
      })
    }),

  userClearedScores: withFeatureFlag(publicProcedure, Feature.Dan)
    .input(object({
      id: string(),
      page: number().min(0).max(5).default(0),
      perPage: number().min(1).max(10).default(10),
    })).query(async ({ input }) => {
      const data = await dans.getUserClearedDans({
        user: { id: DanProvider.stringToId(input.id) },
        page: input.page,
        perPage: input.perPage,
      })

      return data.map((item) => {
        return {
          ...item,
          dan: mapId(item.dan, DanProvider.idToString),
          score: {
            ...item.score,
            id: ScoreProvider.scoreIdToString(item.score.id),
            beatmap: {
              ...item.score.beatmap,
              id: DanProvider.idToString(item.score.beatmap.id),
              beatmapset: mapId(item.score.beatmap.beatmapset, DanProvider.idToString),
            },
          },
        }
      }) satisfies BaseDanProvider.UserDanClearedScore<string, string>[]
    }),

  exportAll: withFeatureFlag(staffProcedure, Feature.Dan)
    .query(async () => {
      return (await dans.exportAll()).map(transformDan)
    }),
})

function transformDan(res: DatabaseDan<any>): DatabaseDan<string> {
  return mapId(res, DanProvider.idToString)
}
