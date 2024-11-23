import { resolve } from 'node:path'
import { access, rename, writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import fsR from 'fs-reverse'
import winston from 'winston'
import { type Id } from '..'
import { Monitored } from './@extends'
import { Logger, disposeAll, observe } from '$base/logger'
import { type UserCompact } from '~/def/user'
import { LogLevel } from '~/def'

export class LogProvider implements Monitored {
  [Monitored.status]: Monitored[typeof Monitored.status] = [Monitored.Status.Up]
  logger = Logger.child({ label: 'logger' })

  constructor() {
    LogProvider.setupFileTransports()
  }

  async get(opt: Partial<{ last: number; loglevel: LogLevel }>) {
    const {
      last = 100,
      loglevel = LogLevel.warn,
    } = opt
    try {
      await access(LogProvider.combined, fs.constants.R_OK)
      return await LogProvider.readLastNLinesFromFile(LogProvider.combined, last, loglevel)
        .then(lines => lines.filter(TSFilter)) as {
        [x: string]: unknown
        level: string
        label: string
        backend?: string
        timestamp: Date
        message?: string
        fix?: string
      }[]
    }
    catch (e) {
      console.error(e)
      this[Monitored.status] = [Monitored.Status.Degraded]
      throw e
    }
  }

  async truncate(caller: UserCompact<Id>) {
    const newFileName = LogProvider.fullName(`${LogProvider.#combined}.${new Date().toISOString()}`)
    await access(LogProvider.combined, fs.constants.W_OK)
    await rename(LogProvider.combined, newFileName)
    disposeAll()
    await writeFile(LogProvider.combined, '')
    LogProvider.setupFileTransports()
    this.logger.warn(`${caller.safeName}<${caller.id}> truncated logs.\nOld logs moved to: ${resolve(newFileName)}`)
  }

  static sharedBaseCfg = {
    tailable: true,
    maxFiles: 100,
    maxsize: 1_000_000,
  }

  static #combined = '.logs/combined'
  static #error = '.logs/error'
  static #extension = '.log'

  static get combined() {
    return LogProvider.fullName(LogProvider.#combined)
  }

  static get error() {
    return LogProvider.fullName(LogProvider.#error)
  }

  static fullName(nm: string) {
    return `${nm}${LogProvider.#extension}`
  }

  static setupFileTransports() {
    observe(new winston.transports.File({ ...LogProvider.sharedBaseCfg, filename: LogProvider.error, level: 'error' }))
    observe(new winston.transports.File({ ...LogProvider.sharedBaseCfg, filename: LogProvider.combined }))
  }

  static async readLastNLinesFromFile(filePath: string, n: number, level: LogLevel): Promise<Record<any, any>[]> {
    const fileStream = fsR(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024, matcher: '\n' }) as fs.ReadStream

    const matched = await new Promise<Array<Record<any, any> & { level: LogLevel }>>((resolve) => {
      const matched: Array<Record<any, any> & { level: LogLevel }> = []
      fileStream.on('data', (line) => {
        try {
          const json = JSON.parse(line as string)
          if (LogLevel[json.level as keyof typeof LogLevel] <= level) {
            matched.push(json)
          }
          if (matched.length >= n) {
            resolve(matched)
          }
        }
        catch {}
      })
      fileStream.on('end', () => {
        resolve(matched)
      })
    })

    fileStream.destroy()

    return matched
  }
}
