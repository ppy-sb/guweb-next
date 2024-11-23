import { nativeEnum, number, object } from 'zod'
import { LogLevel } from '~/def'
import { logs } from '~/server/singleton/service'
import { staffProcedure as pAdmin } from '~/server/trpc/middleware/role'
import { router as _router } from '~/server/trpc/trpc'

export const router = _router({
  last: pAdmin
    .input(object({ last: number(), loglevel: nativeEnum(LogLevel) }))
    .query(async ({ input }) => {
      return (await logs.get(input)).reverse()
    }),
  truncate: pAdmin.mutation(async ({ ctx }) => {
    await logs.truncate(ctx.user)
    return await logs.get({ last: 2 })
  }),
})
