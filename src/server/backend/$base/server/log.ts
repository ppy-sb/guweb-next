import { resolve } from 'node:path'
import { access, rename, writeFile } from 'node:fs/promises'
import fs from 'node:fs'
import winston from 'winston'
import { type Id } from '..'
import { Monitored } from './@extends'
import { Logger, disposeAll, observe } from '$base/logger'
import { type UserCompact } from '~/def/user'

export class LogProvider implements Monitored {
  [Monitored.status]: Monitored[typeof Monitored.status] = [Monitored.Status.Up]
  logger = Logger.child({ label: 'logger' })

  constructor() {
    LogProvider.setupFileTransports()
  }

  async get(last: number) {
    try {
      await access(LogProvider.combined, fs.constants.R_OK)
      return LogProvider.readLastNLinesFromFile(LogProvider.combined, last)
        .then(lines => lines.map((line) => {
          if (!line.trim()) {
            return undefined
          }
          try {
            const v = JSON.parse(line)
            v.timestamp = new Date(v.timestamp)
            return v
          }
          catch (e) {
            return {
              level: 'Worst',
              label: 'Unknown cause, recorded bad log',
              backend: 'Log',
              message: line,
              timestamp: new Date(0),
            }
          }
        }).filter(TSFilter)) as Promise<{
          [x: string]: unknown
          level: string
          label: string
          backend?: string
          timestamp: Date
          message?: string
          fix?: string
        }[]>
    }
    catch (e) {
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

  static async readLastNLinesFromFile(filePath: string, n: number): Promise<string[]> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024 })
    const buffer: string[] = []
    const lastNLines: string[] = []

    for await (const chunk of fileStream) {
      const lines = chunk.split(/\r?\n/)
      const tail = lines.pop()
      if (tail) {
        buffer.unshift(tail)
      }
      lastNLines.push(...lines.reverse())
      if (lastNLines.length >= n) {
        break
      }
    }

    if (lastNLines.length < n) {
      lastNLines.push(...buffer)
    }

    return lastNLines.slice(0, n)
  }
}
