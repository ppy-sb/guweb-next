import { TRPCError } from '@trpc/server'
import { array, number, object, string } from 'zod'
import { hasLeaderboardRankingSystem, hasRuleset } from '../config'
import { optionalUserProcedure } from '../middleware/optional-user'
import { sessionProcedure } from '../middleware/session'
import {
  zodEmailValidation,
  zodHandle,
  zodLeaderboardRankingSystem,
  zodMode,
  zodRankingStatus,
  zodRelationType,
  zodRuleset,
} from '../shapes'
import { router as _router, publicProcedure as p } from '../trpc'
import { Logger } from '$base/logger'
import { type MailTokenProvider as MBase, type MailTokenProvider } from '$base/server'
import { type Mode } from '~/def'
import { type RankingStatus } from '~/def/beatmap'
import { type LeaderboardRankingSystem } from '~/def/common'
import { Mail } from '~/def/mail'
import { GucchoError } from '~/def/messages'
import { type RankingSystemScore } from '~/def/score'
import { Scope, type UserCompact, UserRole } from '~/def/user'
import { Constant } from '~/server/common/constants'
import { MapProvider, ScoreProvider, UserProvider, mail, mailToken, userRelations, users } from '~/server/singleton/service'
import ui from '~~/guccho.ui.config'

const logger = Logger.child({ label: 'user' })

export const map = localeKey.root

function userIsVisible(user: Pick<UserCompact<any>, 'id' | 'roles'>, viewer?: Pick<UserCompact<any>, 'id' | 'roles'>) {
  return user.id === viewer?.id
  || viewer?.roles.includes(UserRole.Staff)
  || (!user.roles.includes(UserRole.Restricted))
}

const userNotFoundError = createGucchoError(GucchoError.UserNotFound)

export const router = _router({
  uniqueIdent: p
    .input(zodHandle)
    .query(({ input: handle }) => {
      return users.uniqueIdent(handle)
    }),
  userpage: optionalUserProcedure
    .input(
      object({
        handle: zodHandle,
      }),
    )
    .query(async ({ input: { handle }, ctx }) => {
      const user = await users.getFull({
        handle,
        excludes: { relationships: true, secrets: true, email: true },
        includeHidden: true,
        scope: Scope.Self,
      })

      if (!userIsVisible(user, ctx.user)) {
        throw userNotFoundError
      }
      return mapId(user, UserProvider.idToString)
    }),
  best: optionalUserProcedure
    .input(
      object({
        handle: zodHandle,
        mode: zodMode,
        ruleset: zodRuleset,
        rankingSystem: zodLeaderboardRankingSystem,
        page: number().gte(0).lt(10),
        includes: array(zodRankingStatus).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { mode, ruleset, rankingSystem } = input
      if (
        !hasRuleset(mode, ruleset)
        || !hasLeaderboardRankingSystem(mode, ruleset, rankingSystem)
      ) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ranking system not supported',
        })
      }
      const user = await users.getCompact({ handle: input.handle, scope: Scope.Self })

      if (!userIsVisible(user, ctx.user)) {
        throw userNotFoundError
      }

      const returnValue = await users.getBests({
        id: user.id,
        mode,
        ruleset,
        rankingSystem,
        page: input.page,
        perPage: 10,
        rankingStatus: input.includes,
      })
      if (!returnValue) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
      // return mapId(returnValue, ScoreProvider.scoreIdToString)
      return returnValue.map(v => ({
        ...mapId(v, ScoreProvider.scoreIdToString),
        beatmap: beatmapIsVisible(v.beatmap)
          ? {
              ...isLocalMapOrMapset(v.beatmap)
                ? mapId(v.beatmap, MapProvider.idToString)
                : mapId(v.beatmap, MapProvider.idToString, ['id', 'foreignId']),
              beatmapset: isLocalMapOrMapset(v.beatmap.beatmapset)
                ? mapId(v.beatmap.beatmapset, MapProvider.idToString)
                : mapId(v.beatmap.beatmapset, MapProvider.idToString, ['id', 'foreignId']),
            }
          : v.beatmap,
      })) as RankingSystemScore<string, string, Mode, LeaderboardRankingSystem, RankingStatus>[]
    }),
  tops: optionalUserProcedure
    .input(
      object({
        handle: zodHandle,
        mode: zodMode,
        ruleset: zodRuleset,
        rankingSystem: zodLeaderboardRankingSystem,
        page: number().gte(0).lt(10),
        includes: array(zodRankingStatus).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { mode, ruleset, rankingSystem } = input
      if (
        !hasRuleset(mode, ruleset)
        || !hasLeaderboardRankingSystem(mode, ruleset, rankingSystem)
      ) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ranking system not supported',
        })
      }

      const user = await users.getCompact({ handle: input.handle, scope: Scope.Self })

      if (!userIsVisible(user, ctx.user)) {
        throw userNotFoundError
      }

      const returnValue = await users.getTops({
        id: user.id,
        mode: input.mode,
        ruleset: input.ruleset,
        rankingSystem: input.rankingSystem,
        page: input.page,
        perPage: 10,
        rankingStatus: input.includes,
      })
      if (!returnValue) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
      return {
        count: returnValue.count,
        scores: returnValue.scores.map(v => ({
          ...mapId(v, ScoreProvider.scoreIdToString),
          beatmap: beatmapIsVisible(v.beatmap)
            ? {
                ...isLocalMapOrMapset(v.beatmap)
                  ? mapId(v.beatmap, MapProvider.idToString)
                  : mapId(v.beatmap, MapProvider.idToString, ['id', 'foreignId']),
                beatmapset: isLocalMapOrMapset(v.beatmap.beatmapset)
                  ? mapId(v.beatmap.beatmapset, MapProvider.idToString)
                  : mapId(v.beatmap.beatmapset, MapProvider.idToString, ['id', 'foreignId']),
              }
            : v.beatmap,
        })) as RankingSystemScore<string, string, Mode, LeaderboardRankingSystem, RankingStatus>[],
      }
    }),
  essential: p
    .input(
      object({
        handle: zodHandle,
      }),
    )
    .query(async ({ input }) => {
      const user = await users.getCompact({ handle: input.handle, scope: Scope.Public })

      return mapId(user, UserProvider.idToString)
    }),
  countRelations: optionalUserProcedure
    .input(
      object({
        handle: zodHandle,
        type: zodRelationType,
      }),
    )
    .query(async ({ input: { handle, type }, ctx }) => {
      const user = await users.getCompact({ handle, scope: Scope.Self })

      if (!userIsVisible(user, ctx.user)) {
        raiseError(userNotFoundError)
      }

      const count = await userRelations.count({ user, type })
      return count
    }),
  status: p
    .input(object({
      id: string().trim(),
    })).query(async ({ input: { id } }) => {
      return await users.status({ id: UserProvider.stringToId(id) })
    }),

  register: _router({
    sendEmailCode: sessionProcedure
      .input(string().email()).mutation(async ({ ctx, input }) => {
        await ctx.session.getBinding() ?? throwGucchoError(GucchoError.SessionNotFound)

        // check if email is taken
        if (
          await users
            .getByEmail(input as MBase.Email, { scope: Scope.Self })
            .catch(_ => undefined)
        ) {
          throwGucchoError(GucchoError.ConflictEmail)
        }
        const variant = Mail.Variant.Registration

        const { otp, token } = await mailToken.getOrCreate(input as MBase.Email)
        const t = await useTranslation(ctx.h3Event)
        const serverName = t(localeKey.root.server.name.__path__)
        const mailVariant = localeKey.root.mail[variant]

        type Param = Mail.Param[typeof variant]

        await mail.send({
          to: input,

          subject: t(
            mailVariant.subject.__path__,
            { serverName } satisfies Param['subject']
          ),

          content: t(
            mailVariant.content.__path__,
            {
              serverName,
              otp,
              link: host(`/mail/verify?t=${token}&a=${variant}`, ctx.h3Event, { fallbackURL: `osu.${ui.baseUrl}` }),
              ttl: Constant.EmailTokenTTLInMinutes as number,
            } satisfies Param['content']
          ),
        })
      }),

    createAccount: sessionProcedure
      .input(object({
        name: string().trim(),
        safeName: string().trim().optional(),
        emailToken: string().uuid(),
        // email: string().trim().email(),
        passwordMd5: string().trim(),
      }))
      .mutation(async ({ input, ctx }) => {
        const rec = await mailToken.get({ token: input.emailToken as MBase.Token }) ?? throwGucchoError(GucchoError.EmailTokenNotFound)
        const { name, safeName, passwordMd5 } = input

        const user = await users.register({
          name,
          safeName,
          passwordMd5,
          email: rec.email,
        })

        await ctx.session.update({ userId: UserProvider.idToString(user.id) })

        // background jobs
        mailToken.deleteAll(rec.email).catch(e => logger.error({ message: `failed to delete mail token: ${e.message}` }))

        return user
      }),

  }),

  accountRecovery: _router({
    otp: p
      .input(string().email())
      .mutation(async ({ ctx, input }) => {
        const variant = Mail.Variant.AccountRecovery

        const user = await users.getByEmail(input as MailTokenProvider.Email, { scope: Scope.Self })

        const { otp, token } = await mailToken.getOrCreate(input as MailTokenProvider.Email)
        const t = await useTranslation(ctx.h3Event)
        const serverName = t(localeKey.root.server.name.__path__)
        const mailVariant = localeKey.root.mail[variant]

       type Param = Mail.Param[typeof variant]

       await mail.send({
         to: input,

         subject: t(
           mailVariant.subject.__path__,
            { serverName } satisfies Param['subject']
         ),

         content: t(
           mailVariant.content.__path__,
            {
              serverName,
              name: user.name,
              otp,
              link: host(`/mail/verify?t=${token}&a=${variant}`, ctx.h3Event, { fallbackURL: `osu.${ui.baseUrl}` }),
              ttl: Constant.EmailTokenTTLInMinutes as number,
            } satisfies Param['content']
         ),
       })
      }),

    changePassword: sessionProcedure
      .input(object({
        password: string(),
        repeatPassword: string(),
        token: zodEmailValidation,
      }))
      .mutation(async ({ input }) => {
        if (!input.password) {
          // TODO refine error message
          throwGucchoError(GucchoError.EmptyPassword)
        }
        if (input.password !== input.repeatPassword) {
          throwGucchoError(GucchoError.PasswordNotMatch)
        }

        const rec = await mailToken.get(input.token)

        if (!rec) {
          throwGucchoError(GucchoError.EmailTokenNotFound)
        }

        const user = await users.getByEmail(rec.email, { scope: Scope.Self })

        await users.changePasswordNoCheck(user, input.password)

        // background jobs
        mailToken.deleteAll(rec.email).catch(e => logger.error({ message: `failed to delete mail token: ${e.message}` }))

        // const refreshed = await ctx.session.update({ user })
        // const opts = {
        //   httpOnly: true,
        //   maxAge: ctx.session.persist ? Constant.PersistDuration as number : undefined,
        // }
        // if (refreshed) {
        //   setCookie(ctx.h3Event, Constant.SessionLabel, refreshed, opts)
        // }
        // if (ctx.session.persist) {
        //   setCookie(ctx.h3Event, Constant.Persist, 'yes', opts)
        // }
      }),
  }),

})
