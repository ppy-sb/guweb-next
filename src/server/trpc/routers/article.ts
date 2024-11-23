import { any, array, boolean, object, record, string, union } from 'zod'
import { optionalUserProcedure } from '../middleware/optional-user'
import { staffProcedure } from '../middleware/role'
import { userProcedure } from '../middleware/user'
import { router as _router } from '../trpc'
import { ArticleProvider, articles } from '~/server/singleton/service'
import { GucchoError } from '~/def/messages'
import { type ArticleProvider as BaseArticleProvider } from '$base/server/article'
import { Logger } from '$base/logger'

const logger = Logger.child({ label: 'article' })

export const router = _router({
  get: userProcedure
    .input(string().trim())
    .query(({ input, ctx }) => articles.get({ slug: input, fallback: true, user: ctx.user })),

  getRendered: optionalUserProcedure
    .input(union([string().trim(), array(string().trim())]))
    .query(async ({ input, ctx }) => {
      if (Array.isArray(input)) {
        input = input.join('/')
      }
      const r = await articles.get({ slug: input, fallback: true, user: ctx.user })
      if (!r) {
        const notFound = ArticleProvider.fallbacks.get('404')
        if (!notFound) {
          throwGucchoError(GucchoError.ArticleNotFound)
        }
        const html = notFound.dynamic ? await ArticleProvider.render(notFound.json) : notFound.html

        return {
          html,
          access: {
            read: true,
            write: false,
          },
        }
      }
      return {
        html: r.dynamic ? await ArticleProvider.render(r.json) : r.html,
        access: r.access,
      }
    }),

  getStaticOrDynamic: optionalUserProcedure
    .input(union([string().trim(), array(string().trim())]))
    .query(async ({ input, ctx }) => {
      if (Array.isArray(input)) {
        input = input.join('/')
      }
      const r = await articles.get({ slug: input, fallback: true, user: ctx.user })
      if (!r) {
        const notFound = ArticleProvider.fallbacks.get('404')
        if (!notFound) {
          throwGucchoError(GucchoError.ArticleNotFound)
        }
        const html = notFound.dynamic ? await ArticleProvider.render(notFound.json) : notFound.html

        return {
          html,
          access: {
            read: true,
            write: false,
          },
        }
      }
      return r.dynamic
        ? {
            json: r.json,
            access: r.access,
          }
        : {
            html: r.html,
            access: r.access,
          }
    }),

  save: staffProcedure
    .input(object({
      slug: string().trim(),
      json: record(any(), any()).refine((arg): arg is BaseArticleProvider.JSONContent => {
        return !!arg
      }),
      privilege: object({
        read: array(ArticleProvider.readAccess),
        write: array(ArticleProvider.writeAccess),
      }),
      dynamic: boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const r = await articles.save(Object.assign(input, { user: ctx.user }))
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> saved article ${input.slug}`, {
        slug: input.slug,
        user: pick(ctx.user, ['id', 'name', 'roles']),
      })
      return r
    }),

  delete: staffProcedure
    .input(object({
      slug: string().trim(),
    }))
    .mutation(async ({ input, ctx }) => {
      const r = await articles.delete(Object.assign(input, { user: ctx.user }))
      logger.info(`user ${ctx.user.safeName}<${ctx.user.id}> deleted article ${input.slug}`, {
        slug: input.slug,
        user: ctx.user,
      })
      return r
    }),

  localSlugs: staffProcedure
    .input(string().trim().optional())
    .query(({ input }) => ArticleProvider.getLocalSlugs(input)),
})
