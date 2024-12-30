import { any, boolean, number, object, string } from 'zod'
import { type DanProvider as BaseDanProvider } from '../../backend/$base/server'
import { staffProcedure } from '../middleware/role'
import { router as _router, publicProcedure } from '../trpc'
import { zodMode, zodRuleset } from '../shapes'
import { validateUsecase } from '~/common/utils/dan'
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, type Requirement } from '~/def/dan'
import { Feature } from '~/def/features'
import { DanProvider, ScoreProvider, dans } from '~/server/singleton/service'

export const router = _router({
  get: withFeatureFlag(publicProcedure, Feature.Dan)
    .input(string())
    .query(async ({ input }) => {
      const res = await dans.get(DanProvider.stringToId(input))
      return {
        ...res,
        id: DanProvider.idToString(res.id),
        requirements: res.requirements.map(i => ({
          ...i,
          id: DanProvider.idToString(i.id),
        })),
      }
    }),

  delete: withFeatureFlag(staffProcedure, Feature.Dan)
    .input(string())
    .mutation(async ({ input }) => await dans.delete(DanProvider.stringToId(input))),

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
        requirements: i.requirements.map(i => ({
          ...i,
          id: DanProvider.idToString(i.id),
        })) satisfies DatabaseRequirementCondBinding<string, Requirement, Cond>[],
      })) satisfies DatabaseDan<string>[]
    }),

  save: withFeatureFlag(staffProcedure, Feature.Dan)
    .input(
      any()
        .refine((i): i is DatabaseDan<string> => !!validateUsecase(i as DatabaseDan<string>))
    )
    .mutation(async ({ input, ctx }) => {
      const i = await dans.saveComposed({
        ...input,
        id: input.id ? DanProvider.stringToId(input.id) : undefined,
        requirements: input.requirements.map(i => ({
          ...i,
          id: i.id ? DanProvider.stringToId(i.id) : undefined,
        })),
      }, ctx.user)
      return {
        ...i,
        id: DanProvider.idToString(i.id),
        requirements: i.requirements.map(i => ({
          ...i,
          id: DanProvider.idToString(i.id),
        })),
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
    .input(string()).query(async ({ input }) => {
      const result = await dans.getQualifiedScores(DanProvider.stringToId(input))
      return result.map(i => ({
        ...i,
        scores: i.scores.map(s => ({
          ...s,
          score: mapId(s.score, ScoreProvider.scoreIdToString),
          player: mapId(s.player, DanProvider.idToString),
          beatmap: mapId(s.beatmap, DanProvider.idToString),
        })),
      })) satisfies BaseDanProvider.RequirementQualifiedScore<string, string>[] as BaseDanProvider.RequirementQualifiedScore<string, string>[]
    }),
})
