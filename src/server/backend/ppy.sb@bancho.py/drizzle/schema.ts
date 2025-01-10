import { relations } from 'drizzle-orm'
import { bigint, boolean, date, datetime, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, tinyint, varchar } from 'drizzle-orm/mysql-core'
import { clans, users } from '../../bancho.py/drizzle/schema'

export {
  achievements, beatmaps, channels,
  clans, clansRelations, clientHashes, clientHashesRelations, comments, commentsRelations, emailTokens, favourites, favouritesRelations,
  ingameLoginsRelations,
  // ingameLogins,
  logs,
  mail, mailRelations, mapRequests, mapsRelations, performanceReports,
  ratings, relationships,
  scores, scoresRelations, sources, sourcesRelations, startups,
  stats, statsRelations, tourneyPoolMaps, tourneyPools, userAchievements,
  users, usersAchievementsRelations,
} from '../../bancho.py/drizzle/schema'

export const ingameLogins = mysqlTable('ingame_logins', {
  id: int('id').autoincrement().notNull(),
  userId: int('userid').notNull(),
  ip: varchar('ip', { length: 45 }).notNull(),
  // you can use { mode: 'date' }, if you want to have Date as type for this column
  osuVer: date('osu_ver', { mode: 'string' }).notNull(),
  osuStream: varchar('osu_stream', { length: 128 }).notNull(),
  datetime: datetime('datetime', { mode: 'date' }).notNull(),
},
(table) => {
  return {
    ingameLoginsId: primaryKey({ columns: [table.id], name: 'ingame_logins_id' }),
  }
})
export const userpages = mysqlTable('userpages', {
  id: int('id').primaryKey().autoincrement().notNull(),
  userId: int('user_id').notNull().references(() => users.id),
  html: text('html'),
  raw: text('raw'),
  rawType: mysqlEnum('raw_type', ['tiptap']),
},
(table) => {
  return {
    userId: index('user_id').on(table.userId),
  }
})

export const scoresForeign = mysqlTable('scores_foreign', {
  id: bigint('id', { mode: 'number' }).notNull(),
  server: varchar('server', { length: 32 }).notNull(),
  originalScoreId: bigint('original_score_id', { mode: 'number' }).notNull(),
  originalPlayerId: int('original_player_id').notNull(),
  recipientId: int('recipient_id').notNull(),
  hasReplay: tinyint('has_replay').notNull(),
  receiptTime: datetime('receipt_time', { mode: 'string' }).notNull(),
},
(table) => {
  return {
    recipientId: index('recipient_id').on(table.recipientId),
    originalPlayerId: index('original_player_id').on(table.originalScoreId),
    server: index('server').on(table.server),
    scoresForeignId: primaryKey({ columns: [table.id], name: 'scores_foreign_id' }),
  }
})
export const scoresSuspicion = mysqlTable('scores_suspicion', {
  scoreId: bigint('score_id', { mode: 'number' }).autoincrement().notNull(),
  kind: mysqlEnum('kind', ['hash', 'replay', 'report', 'ppcap']).default('replay'),
  reason: varchar('reason', { length: 128 }).notNull(),
  isChecked: boolean('is_checked').notNull(),
  detail: json('detail').notNull(),
  suspicionTime: datetime('suspicion_time', { mode: 'string' }).notNull(),
},
(table) => {
  return {
    scoresSuspicionScoreId: primaryKey({ columns: [table.scoreId], name: 'scores_suspicion_score_id' }),
  }
})

export const userpagesRelations = relations(userpages, ({ one }) => ({
  user: one(users, { fields: [userpages.userId], references: [users.id] }),
}))

export const usersRelations = relations(users, ({ one }) => ({
  clan: one(clans, { fields: [users.clanId], references: [clans.id] }),
  userpages: one(userpages, { fields: [users.id], references: [userpages.userId] }),
}))
