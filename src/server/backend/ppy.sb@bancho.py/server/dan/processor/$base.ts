import { type DanProvider } from '..'
import { Logger } from '~/server/backend/ppy.sb@bancho.py/log'

export abstract class BaseDanProcessor {
  logger = Logger.child({ label: 'dan:processor' })
  constructor(readonly dp: DanProvider) {}
  abstract init(): Promise<void>
  abstract dispose(): Promise<void>
}
