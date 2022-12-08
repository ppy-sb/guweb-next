import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

import { zodHandle } from '../shapes'
import { procedureWithSession as pSession } from '../middleware/session'
import { router as _router } from '../trpc'
import { passwordMismatch, sessionNotFound, unableToRetrieveSession, unknownError, userNotFound } from '../messages'
import { getSession } from './../../session/index'
import UserDataProvider from '$/client/user'

const { compare } = bcrypt
const provider = new UserDataProvider()
export const router = _router({
  login: pSession.input(z.object({
    handle: zodHandle,
    md5HashedPassword: z.string(),
  })).query(async ({ input: { handle, md5HashedPassword }, ctx }) => {
    try {
      const user = await provider.getBaseUser({ handle, includes: { secrets: true } })
      if (user == null) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: userNotFound,
        })
      }
      const result = await compare(md5HashedPassword, user.secrets.password)
      if (!result) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: passwordMismatch,
        })
      }
      const session = await ctx.session.getBinding()
      if (!session) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: unableToRetrieveSession,
        })
      }
      session.userId = user.id
      return {
        user,
      }
    }
    catch (err) {
      if (err instanceof TRPCError)
        throw err

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: unknownError,
      })
    }
  }),
  retrieve: pSession.input(z.object({
    sessionId: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    let session
    if (input?.sessionId)
      session = await getSession(input.sessionId)
    else
      session = await ctx.session.getBinding()

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: sessionNotFound,
      })
    }
    return {
      user: (session.userId && await provider.getBaseUser({ handle: session.userId })) ?? undefined,
    }
  }),
})
