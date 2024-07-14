import { any, number, object, string } from 'zod'
import { router as _router, publicProcedure } from '../trpc'
import { staffProcedure } from '../middleware/role'
import { DanProvider, ScoreProvider, dans } from '~/server/singleton/service'
import { type Cond, type Dan, type DatabaseDan, type DatabaseRequirementCondBinding, type Requirement, type RequirementCondBinding } from '~/def/dan'
import { validateUsecase } from '~/common/utils/dan'

export const router = _router({
  get: publicProcedure
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

  delete: staffProcedure
    .input(string())
    .mutation(async ({ input }) => await dans.delete(DanProvider.stringToId(input))),

  search: publicProcedure
    .input(object({
      keyword: string(),
      page: number().min(0).max(5).default(0),
      perPage: number().min(1).max(10).default(10),
    }))
    .query(async ({ input }) => {
      const searchResult = await dans.search(input)
      const scoreResult = await Promise.all(searchResult.map(s => dans.runCustomDan(s)))
      return searchResult.map((i, idxDan) => ({
        ...i,
        id: DanProvider.idToString(i.id),
        requirements: i.requirements.map((i, idxReq) => ({
          ...i,
          id: DanProvider.idToString(i.id),
          scores: scoreResult[idxDan][idxReq].results.map(i => ({
            ...i,
            score: {
              ...i.score,
              id: ScoreProvider.scoreIdToString(i.score.id),
            },
          })),
        })) satisfies DatabaseRequirementCondBinding<string, Requirement, Cond>[],
      })) satisfies DatabaseDan<string>[]
    }),

  save: staffProcedure
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

  userRule: publicProcedure.input(any().refine((i): i is Dan => validateUsecase(i))).query(async ({ input }) => {
    const result = await dans.runCustomDan(input)
    return result.map(i => ({
      ...i,
      results: i.results.map(s => ({
        ...s,
        score: {
          ...s.score,
          id: ScoreProvider.scoreIdToString(s.score.id),
        },
      })),
    }))
  }),
})
