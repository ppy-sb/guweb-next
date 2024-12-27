import { int, json, mysqlTable, timestamp } from 'drizzle-orm/mysql-core'
import { users } from './schema'

export const danConds = mysqlTable('dan_conds', {
  id: int('id').autoincrement().notNull().primaryKey(),
  cond: json('cond').notNull(),
  creator: int('creator').references(() => users.id, { onDelete: 'set null' }),
  updater: int('updater').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
})
