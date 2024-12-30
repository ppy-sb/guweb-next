// keep relative imports for drizzle-kit
import { relations } from 'drizzle-orm'
import { bigint, boolean, date, datetime, foreignKey, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { clans, scores, users } from '../../bancho.py/drizzle/schema'
import { OP, Requirement } from '../../../../def/dan'
import { type ObjValueTuple } from '../../../../def/good-to-have'

type OPTuple = ObjValueTuple<typeof OP>
type RequirementTuple = ObjValueTuple<typeof Requirement>
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
  hasReplay: boolean('has_replay').notNull(),
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
  createdAt: datetime('created_at', { mode: 'string' }).notNull(),
},
(table) => {
  return {
    scoresSuspicionScoreId: primaryKey({ columns: [table.scoreId], name: 'scores_suspicion_score_id' }),
  }
})

export const dans = mysqlTable('sb_dans', {
  id: int('id').autoincrement().notNull().primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  creator: int('creator').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  updater: int('updater').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
})

export const danConds = mysqlTable('sb_dan_conds', {
  id: int('id').autoincrement().notNull().primaryKey(),
  type: mysqlEnum('type', Object.values(OP) as OPTuple).notNull(),
  value: varchar('value', { length: 128 }).notNull(),
  parent: int('parent'),
})

export const requirementCondBindings = mysqlTable('sb_requirement_cond_bindings', {
  id: int('id').autoincrement().notNull().primaryKey(),
  type: mysqlEnum('requirement', Object.values(Requirement) as RequirementTuple).notNull(),
  danId: int('dan').notNull().references(() => dans.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  condId: int('cond').notNull().references(() => danConds.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
})

export const requirementClearedScores = mysqlTable('sb_requirement_cleared_scores', {
  scoreId: bigint('score_id', { mode: 'bigint', unsigned: true })
    .notNull()
    .references(() => scores.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  requirement: int('requirement').notNull(),
}, tbl => ({
  requirement_cleared_binding: foreignKey({
    columns: [tbl.requirement],
    foreignColumns: [requirementCondBindings.id],
    name: 'requirement_cleared_binding',
  })
    .onDelete('cascade')
    .onUpdate('cascade'),
}))

export const userpagesRelations = relations(userpages, ({ one }) => ({
  user: one(users, { fields: [userpages.userId], references: [users.id] }),
}))

export const usersRelations = relations(users, ({ one }) => ({
  clan: one(clans, { fields: [users.clanId], references: [clans.id] }),
  userpages: one(userpages, { fields: [users.id], references: [userpages.userId] }),
}))

export const danRelations = relations(dans, ({ many }) => ({
  requirements: many(requirementCondBindings),
}))

export const danCondsRelations = relations(danConds, ({ one }) => ({
  parent: one(danConds, { fields: [danConds.parent], references: [danConds.id] }),
}))

export const requirementCondBindingRelations = relations(requirementCondBindings, ({ one }) => ({
  dan: one(dans, { fields: [requirementCondBindings.danId], references: [dans.id] }),
  cond: one(danConds, { fields: [requirementCondBindings.condId], references: [danConds.id] }),
}))

export const requirementClearedScoreRelations = relations(requirementClearedScores, ({ one }) => ({
  score: one(scores, { fields: [requirementClearedScores.scoreId], references: [scores.id] }),
  requirement: one(requirementCondBindings, { fields: [requirementClearedScores.requirement], references: [requirementCondBindings.id] }),
}))
