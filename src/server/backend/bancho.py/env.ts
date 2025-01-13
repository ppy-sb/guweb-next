import { discriminatedUnion, literal, object, string } from 'zod'
import { zodFQDN as FQDN, zodPath as path } from '~/server/trpc/shapes'
import { validator as base, redis, redisURL } from '$base/env'
import env from '~~/guccho.backend.config'

export const database = literal('database')
export const header = literal('header')
export const api = literal('api')
export const dsn = string().url()
export const rank = discriminatedUnion('leaderboardSource', [
  object({
    leaderboardSource: database,
  }),
  object({
    leaderboardSource: redis,
    redisURL,
  }),
])

export const avatar = object({
  location: path,
  domain: FQDN,
})

export const apiEndpoint = object({
  v1: string().url().optional(),
}).optional()

export const validator = base.and(object({
  dsn,
  replica: dsn,
  avatar,
  api: apiEndpoint,
}).and(rank))

export const config = lazySingleton(() => validator.parse(env))
