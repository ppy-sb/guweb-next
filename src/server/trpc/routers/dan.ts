import { any, number, object, string } from 'zod'
import { router as _router, publicProcedure } from '../trpc'
import { staffProcedure } from '../middleware/role'
import { DanProvider, ScoreProvider, dans } from '~/server/singleton/service'
import { type Dan, type DatabaseDan } from '~/def/dan'
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

  delete: publicProcedure
    .input(string())
    .mutation(async ({ input }) => await dans.delete(DanProvider.stringToId(input))),

  search: publicProcedure
    .input(object({
      keyword: string(),
      page: number().min(0).max(5).default(0),
      perPage: number().min(1).max(10).default(10),
    }))
    .query(async ({ input }): Promise<DatabaseDan<string>[]> => {
      const result = await dans.search(input)
      return result.map(i => ({
        ...i,
        id: DanProvider.idToString(i.id),
        requirements: i.requirements.map(i => ({
          ...i,
          id: DanProvider.idToString(i.id),
        })),
      }))
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
