import { type ZodSchema, instanceof as instanceof_, nativeEnum, number, object, string } from 'zod'
import { zodEmailValidation, zodHandle, zodRelationType, zodTipTapJSONContent } from '../shapes'
import { router as _router } from '../trpc'
import { GucchoError } from '~/def/messages'
import { settings } from '$active/dynamic-settings'
import { extractLocationSettings, extractSettingValidators } from '$base/@define-setting'
import type { ChatProvider as BChat, MailTokenProvider } from '$base/server'
import { Mode, Relationship, Ruleset } from '~/def'
import { CountryCode } from '~/def/country-code'
import { Mail } from '~/def/mail'
import { DynamicSettingStore, Scope } from '~/def/user'
import { Constant } from '~/server/common/constants'
import { UserProvider, UserRelationProvider, chats, mail, mailToken, sessions, userRelations, users } from '~/server/singleton/service'
import { userProcedure as pUser } from '~/server/trpc/middleware/user'
import ui from '~~/guccho.ui.config'
import { Logger } from '$base/logger'

const logger = Logger.child({ label: 'me' })

export const router = _router({
  settings: pUser.query(async ({ ctx }) => {
    const result = await users.getSettings({
      handle: UserProvider.idToString(ctx.user.id),
      includeHidden: true,
      excludes: { statistics: true, relationships: true, secrets: false },
      scope: Scope.Self,
    })

    return mapId(result, UserProvider.idToString)
  }),

  dynamicSettings: _router({
    get: pUser.query(({ ctx }) => {
      return users.getDynamicSettings(ctx.user)
    }),
    update: pUser.input(
      extractSettingValidators(
        extractLocationSettings(DynamicSettingStore.Server, settings)
      )
    ).mutation(async ({ ctx, input }) => {
      const result = await users.setDynamicSettings(ctx.user, input)
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> updated dynamic settings.`, { user: pick(ctx.user, ['id', 'name']), input })
      return result
    }),
  }),

  changeUserpage: pUser
    .input(
      object({
        profile: zodTipTapJSONContent,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await users.changeUserpage?.(ctx.user, {
        profile: input.profile,
      })
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> updated user page.`, { user: pick(ctx.user, ['id', 'name']) })
      return result
    }),

  changeEmail: _router({
    validateEmail: pUser
      .input<ZodSchema<MailTokenProvider.Email>>(string().email() as any)
      .mutation(async ({ ctx, input: email }): Promise<'otp' | 'succeed'> => {
        const mailUser = await users.getByEmail(email, { scope: Scope.Self }).catch(noop)

        if (mailUser?.id === ctx.user.id) {
          return 'succeed'
        }

        if (mailUser) {
          throwGucchoError(GucchoError.ConflictEmail)
        }
        const variant = Mail.Variant.ChangeMail
        type Param = Mail.Param[typeof variant]

        const [t, { otp, token }] = await Promise.all([
          useTranslation(ctx.h3Event),
          mailToken.getOrCreate(email),
        ])

        const serverName = t(localeKey.root.server.name.__path__)
        const mailVariant = localeKey.root.mail[variant]

        await mail.send({
          to: email,

          content: t(
            mailVariant.content.__path__,
            {
              name: ctx.user.name,
              serverName,
              otp,
              link: host(`/mail/verify?t=${token}&a=${variant}`, ctx.h3Event, { fallbackURL: `osu.${ui.baseUrl}` }),
              ttl: Constant.EmailTokenTTLInMinutes as number,
            } satisfies Param['content']
          ),

          subject: t(
            mailVariant.subject.__path__,
            { serverName } satisfies Param['subject']
          ),
        })
        logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> requested to change email to ${email}.`, { user: pick(ctx.user, ['id', 'name']) })
        return 'otp'
      }),

    changeWithToken: pUser
      .input(zodEmailValidation)
      .mutation(async ({ ctx, input }) => {
        const rec = await mailToken.get(input) ?? throwGucchoError(GucchoError.EmailTokenNotFound)
        const result = await users.changeEmail(ctx.user, rec.email)
        logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> changed email to ${rec.email}.`, { user: pick(ctx.user, ['id', 'name']) })
        mailToken.deleteAll(rec.email).catch(e => logger.error(e))
        return result
      }),
  }),

  changeSettings: pUser
    .input(
      object({
        // email: string().email(),
        name: string().trim(),
        flag: nativeEnum(CountryCode),
        preferredMode: object({
          mode: nativeEnum(Mode),
          ruleset: nativeEnum(Ruleset),
        }),
      }).partial(),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await users.changeSettings(ctx.user, input) ?? throwGucchoError(GucchoError.UpdateUserSettingsFailed)

      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> updated settings.`, { user: pick(ctx.user, ['id', 'name']) })

      ctx.user = result
      return mapId(ctx.user, UserProvider.idToString)
    }),

  changeAvatar: pUser
    .input(object({
      avatar: instanceof_(Uint8Array),
    }))
    .mutation(async ({ ctx, input }) => {
      const r = await users.changeAvatar(ctx.user, input.avatar)
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> changed avatar.`, { user: pick(ctx.user, ['id', 'name']) })
      return r
    }),

  updatePassword: pUser
    .input(
      object({
        oldPassword: string(),
        newPassword: string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await users.changePassword(
        ctx.user,
        input.oldPassword,
        input.newPassword,
      )

      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> updated password.`, { user: pick(ctx.user, ['id', 'name']) })

      return mapId(result, UserProvider.idToString)
    }),

  relation: pUser
    .input(
      object({
        target: zodHandle,
      }),
    )
    .query(async ({ input: { target }, ctx }) => {
      const fromUser = ctx.user
      const targetUser = await users.getCompact({ handle: target, scope: Scope.Self })

      if (!fromUser || targetUser == null) {
        return
      }

      const [fromRelationship, targetRelationship] = await Promise.all([
        userRelations.getOne(fromUser, targetUser),
        userRelations.getOne(targetUser, fromUser),
      ])
      return {
        self: [fromRelationship],
        counterpart: [targetRelationship],
        mutual:
          (fromRelationship !== undefined && targetRelationship !== undefined)
            ? calculateMutualRelationships(
              [fromRelationship],
              [targetRelationship],
            )
            : undefined,
      }
    }),

  relations: pUser.query(async ({ ctx }) => {
    return (await userRelations.get({ user: ctx.user })).map(f => mapId(f, UserRelationProvider.idToString))
  }),

  notMutual: pUser.query(async ({ ctx }) => {
    return (await userRelations.notMutual(ctx.user)).map(u => mapId(u, UserRelationProvider.idToString))
  }),

  removeOneRelation: pUser
    .input(
      object({
        target: zodHandle,
        type: zodRelationType,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fromUser = ctx.user
      const targetUser = await users.getCompact({ handle: input.target, scope: Scope.Self })

      if (!fromUser || targetUser == null) {
        throwGucchoError(GucchoError.AtLeastOneUserNotExists)
      }
      try {
        await userRelations.removeOne({
          fromUser,
          targetUser,
          type: input.type,
        })
        logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> removed relationship [${Relationship[input.type]}] with ${input.target}.`, { user: pick(ctx.user, ['id', 'name']) })
        return true
      }
      catch (err: any) {
        if (err.message === 'not-found') {
          throwGucchoError(GucchoError.RelationNotFound)
        }
        throw err
      }
    }),

  addOneRelation: pUser
    .input(
      object({
        target: zodHandle,
        type: zodRelationType,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const fromUser = ctx.user
      const targetUser = await users.getCompact({ handle: input.target, scope: Scope.Self })
      if (!fromUser || targetUser == null) {
        throwGucchoError(GucchoError.AtLeastOneUserNotExists)
      }
      try {
        await userRelations.createOneRelationship({
          fromUser,
          targetUser,
          type: input.type,
        })
        logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> added relationship [${Relationship[input.type]}] with ${input.target}.`, { user: pick(ctx.user, ['id', 'name']) })
        return true
      }
      catch (err: any) {
        if (err.message === 'has-relationship') {
          throwGucchoError(GucchoError.ConflictRelation)
        }
      }
    }),

  sessions: pUser.query(async ({ ctx }) => {
    const search = { userId: UserProvider.idToString(ctx.user.id) }
    const results = await sessions.store.findAll(search)

    type TRes = typeof results
    type TV = TRes[keyof TRes] & { current?: true }

    Object.entries(results as Record<keyof TRes, TV>).forEach(([sId, session]) => {
      if (sId === ctx.session.id) {
        session.current = true
      }
      delete (session as any).userId
    })
    return results as Record<keyof TRes, TV>
  }),

  kickSession: pUser.input(object({
    session: string(),
  }))
    .mutation(async ({ input, ctx }) => {
      const target = await sessions.get(input.session)
      if (!target) {
        throw new Error('not your session')
      }
      const self = await ctx.session.getBinding()
      if (self?.userId !== target.userId) {
        throw new Error('not your session')
      }
      const r = await sessions.destroy(input.session)
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> kicked session ${input.session}.`, { user: pick(ctx.user, ['id', 'name']) })
      return r
    }),

  chat: _router({
    recent: pUser
      .input(
        object({
          page: number().min(0).default(0),
          userId: string(),
        }))
      .query(async ({ ctx, input }) => {
        const to = { id: UserProvider.stringToId(input.userId) }
        const messages = await chats.getMessagesBetween(ctx.user, to, { page: input.page, perPage: 50 })
        return messages.map<BChat.IPrivateMessage<string>>(i => chats.serialize(i))
      }),
    send: pUser
      .input(
        object({
          to: string(),
          message: string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const target = await users.getCompactById(UserProvider.stringToId(input.to))
        if (!target) {
          throwGucchoError(GucchoError.UserNotFound)
        }
        await chats.send({
          from: ctx.user,
          to: target,
          content: input.message,
        })
      }),
  }),
})
