import process from 'node:process'
import { createLogger, format, transports } from 'winston'
import type Transport from 'winston-transport'

const { combine, timestamp, json, printf } = format

export const Logger = createLogger({
  defaultMeta: {
  },
  format: combine(
    timestamp(),
    json(),
  ),
})
const logging = new Set<Transport>()
export function observe(transport: Transport) {
  if (logging.has(transport)) {
    dispose(transport)
  }
  Logger.add(transport)
  logging.add(transport)
}

export function dispose(transport: Transport) {
  Logger.remove(transport)
  logging.delete(transport)
}

export function disposeAll() {
  logging.forEach(Logger.remove.bind(Logger))
}
if (process.env.NODE_ENV !== 'production') {
  const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`
  })
  Logger.add(new transports.Console({
    format: myFormat,
  }))
}
