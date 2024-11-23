import { TRPCError } from '@trpc/server'
import { boolean, object, string } from 'zod'
import { sessionProcedure as pSession } from '../middleware/session'
import { zodHandle } from '../shapes'
import { router as _router, publicProcedure } from '../trpc'
import {
  GucchoError,
} from '~/def/messages'
import { UserProvider, sessions, users } from '~/server/singleton/service'
import { Constant } from '~/server/common/constants'
import { Logger } from '$base/logger'

const logger = Logger.child({ label: 'session' })

export const router = _router({
  login: publicProcedure
    .input(
      object({
        handle: zodHandle,
        md5HashedPassword: string(),
        persist: boolean(),
      }),
    )
    .mutation(async ({ input: { handle, md5HashedPassword, persist }, ctx }) => {
      try {
        const ip = getRequestIP(ctx.h3Event, { xForwardedFor: true }) ?? '0.0.0.0'
        const UA = getHeader(ctx.h3Event, 'User-Agent')

        const [ok, user] = await users.testPassword({ handle }, md5HashedPassword)
        if (!ok) {
          logger.info(`user ${user.safeName}<${user.id}> attempted to login with incorrect password from ${ip}, UA: ${UA}.`, { user: pick(user, ['id', 'name']), ip })
          throwGucchoError(GucchoError.IncorrectPassword)
        }

        const opt = {
          httpOnly: true,
          maxAge: persist ? Constant.PersistDuration as number : undefined,
        }
        const partialSession = { userId: UserProvider.idToString(user.id) }
        const [newSessionId] = ctx.session.id
          ? (
              await sessions.update(ctx.session.id, partialSession)
               ?? await sessions.create(Object.assign(partialSession, detectDevice(ctx.h3Event)))
            )
          : await sessions.create(Object.assign(partialSession, detectDevice(ctx.h3Event)))

        if (newSessionId !== ctx.session.id || persist) {
          setCookie(ctx.h3Event, Constant.SessionLabel, newSessionId, opt)
        }
        if (persist) {
          setCookie(ctx.h3Event, Constant.Persist, 'yes', opt)
        }
        logger.info(`user ${user.safeName}<${user.id}> logged in from ${ip}, UA: ${UA}.`, { user: pick(user, ['id', 'name']), ip })
        return {
          user: mapId(user, UserProvider.idToString),
        }
      }
      catch (err) {
        if (err instanceof TRPCError) {
          throw err
        }

        // unknown error
        logger.error(err)
        throwGucchoError(GucchoError.UnknownError)
      }
    }),
  retrieve: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session.id) {
        throwGucchoError(GucchoError.SessionNotFound)
      }
      const session = await sessions.get(ctx.session.id)

      if (!session) {
        throwGucchoError(GucchoError.SessionNotFound)
      }
      if (session.userId) {
        try {
          const user = await users.getCompactById(UserProvider.stringToId(session.userId))
          return {
            user: mapId(user, UserProvider.idToString),
          }
        }
        catch (_) {
          return {
            user: null,
          }
        }
      }
      return {
        user: null,
      }
    }),
  destroy: pSession
    .mutation(async ({ ctx }) => {
      deleteCookie(ctx.h3Event, Constant.SessionLabel)
      deleteCookie(ctx.h3Event, Constant.Persist)

      const maybeUser = await ctx.session.getBinding()

      const r = await sessions.destroy(ctx.session.id)
      logger.info(`${maybeUser ? `user <${maybeUser.userId}> ` : ''}destroyed session ${ctx.session.id}.`, { maybeUser, id: ctx.session.id })
      return r
    }),
})
