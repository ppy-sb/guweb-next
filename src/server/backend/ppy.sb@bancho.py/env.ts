import { object, string } from 'zod'
import { validator as bpy } from '../bancho.py/env'
import env from '~~/guccho.backend.config'

export const validator = bpy.and(object({
  api: object({
    sb: string().url(),
  }),
}))

export const config = lazySingleton(() => validator.parse(env))
