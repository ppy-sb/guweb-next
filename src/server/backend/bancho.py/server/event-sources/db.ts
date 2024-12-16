import { parseDsnOrThrow } from '@httpx/dsn-parser'
import MySQLEvents, { type RowEvent } from '@rodrigogs/mysql-events'
import { type InferSelectModel, type Table, getTableColumns, getTableName } from 'drizzle-orm'
import gucchoBackendConfig from '~~/guccho.backend.config'

// import * as mysql from '@vlasky/mysql'

const parsed = parseDsnOrThrow(gucchoBackendConfig.replica)

// const dsn = {
//   host: parsed.host,
//   user: parsed.user,
//   password: parsed.pass,
//   port: parsed.port,
// }

// const connection = mysql.createConnection(dsn)

export const instance = new MySQLEvents(gucchoBackendConfig.replica, {
  startAtEnd: true,
  excludedSchemas: {
    mysql: true,
  },
})

await instance.start()

instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, console.error)
instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, console.error)

export function watchTable<T extends Table>(table: T, statement: keyof typeof MySQLEvents.STATEMENTS, cb: (event: RowEvent<InferSelectModel<T>>) => void) {
  const head = parsed.db ? `${parsed.db}.` : ''
  const tableName = head + getTableName(table)

  const ctx = {
    name: generateTriggerName(tableName, statement),
    expression: `${tableName}.*`,
    statement,

  }

  instance.addTrigger(Object.assign(ctx, {
    onEvent: function preprocessZongJiEvent(event: RowEvent<Record<string, unknown>>) {
      const evt: RowEvent<InferSelectModel<T>> = {
        ...event,
        affectedColumns: [],
        affectedRows: [],
      }
      const columns = getTableColumns(table)
      for (const col in columns) {
        const name = columns[col].name
        if (event.affectedColumns.includes(name)) {
          evt.affectedColumns.push(col)
        }
      }
      for (const row of event.affectedRows) {
        const newRow = {
          before: row.before ? toAliasedRow(table, row.before) : undefined,
          after: row.after ? toAliasedRow(table, row.after) : undefined,
        }
        evt.affectedRows.push(newRow as any)
      }
      cb(evt)
    },
  }))

  return {
    dispose() {
      instance.removeTrigger(ctx)
    },
  }
}

function generateTriggerName(tableName: string, statement: keyof typeof MySQLEvents.STATEMENTS) {
  return `guccho-${tableName}-${statement}`
}

function toAliasedRow<T extends Table>(table: T, row: Record<string, unknown>) {
  const columns = getTableColumns(table)
  const newRow: Record<string, unknown> = {}
  for (const col in columns) {
    const _col = columns[col]
    newRow[col] = _col.mapFromDriverValue(row[_col.name])
  }
  return newRow as InferSelectModel<T>
}
