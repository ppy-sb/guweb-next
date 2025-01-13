import { discriminatedUnion, literal, number, object, string } from 'zod'
import * as bpy from '../bancho.py/env'
import env from '~~/guccho.backend.config'

export const validator = bpy.validator.and(object({
  dan: discriminatedUnion('processor', [
    object({
      processor: literal('realtime'),
    }),
    object({
      processor: literal('interval'),
      interval: number(),
    }),
  ]).or(literal(false)),
  api: object({
    sb: string().url(),
  }),
}))

export const config = lazySingleton(() => validator.parse(env))
