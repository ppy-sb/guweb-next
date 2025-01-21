import { initTRPC } from '@trpc/server'
import { ZodError } from 'zod'
import type { Context } from './context'
import { transformer } from './transformer'

// Avoid exporting the entire t-object since it's not very
// descriptive and can be confusing to newcomers used to t
// meaning translation in i18n libraries.
export const t = initTRPC.context<Context>().create({
  transformer,
  errorFormatter(opts) {
    const { shape, error } = opts
    const eData = {
      ...(import.meta.dev ? shape.data : { code: shape.data.code, httpStatus: shape.data.httpStatus }),
      zodError:
          (error.code === 'BAD_REQUEST' && error.cause instanceof ZodError)
            ? error.cause.flatten()
            : undefined,
    }
    for (const i in eData) {
      if (typeof eData[i as keyof typeof eData] === 'undefined') {
        delete eData[i as keyof typeof eData]
      }
    }

    return {
      ...shape,
      // ...pick(shape, ['code', 'message']),
      data: eData,
      statusCode: shape.data.httpStatus || shape.code,
    }
  },

})
// Base router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

export const middleware = t.middleware
