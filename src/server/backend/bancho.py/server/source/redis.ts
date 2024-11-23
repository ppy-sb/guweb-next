import { createClient } from 'redis'
import { Logger } from '../../log'
import { config as _env } from '../../env'

const logger = Logger.child({ label: 'redis' })

export class RedisNotReadyError extends Error {}

export const client = lazySingleton(() => {
  const env = _env()
  if (!('redisURL' in env)) {
    const err = new Error('required redis client without set redis url.')
    logger.error(err)
    throw err
  }

  const client = createClient({
    url: env.redisURL.startsWith('redis') ? env.redisURL : undefined,
    socket: {
      path: env.redisURL.startsWith('unix') ? env.redisURL : undefined,
    },
  })

  const lastErr = new Map<string, { err: Error; lastReportedAt: number; count: number; debounce: number; adaptiveRatio: number }>()
  client.on('error', (err: Error) => {
    const same = lastErr.get(err.stack || err.message)
    if (same) {
      if (same.err.stack === err?.stack) {
        const now = Date.now()

        const gap = now - same.lastReportedAt

        if (gap <= same.debounce) {
          same.count++
          same.err = err
        }

        if ((same.count > 2) && (gap >= same.debounce * same.adaptiveRatio ** 2)) {
          same.debounce = same.debounce / same.adaptiveRatio
        }

        if (gap > same.debounce) {
          if (same.count > 1) {
            logger.error({ ...same.err, message: `(${same.count}x) ${same.err.message}` })
            same.debounce *= same.adaptiveRatio
          }
          else {
            logger.error(err)
          }

          same.count = 0
          same.err = err
          same.lastReportedAt = now
        }
      }
    }
    else {
      if ('code' in err && err.code === 'ECONNREFUSED') {
        logger.error('redis connection refused.')
      }
      else {
        logger.error(err)
      }
      lastErr.set(err.stack || err.message, { err, lastReportedAt: Date.now(), debounce: 1000, count: 0, adaptiveRatio: 1.3 })
    }
  })

  client.connect()

  return client
})
