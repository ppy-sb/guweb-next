import { and, eq, sql } from 'drizzle-orm'
import testData from '~/common/achievements/reform-6th'
import { useDrizzle } from '~/server/backend/bancho.py/server/source/drizzle'
import * as schema from '~/server/backend/bancho.py/drizzle/schema'
import { danSQLChunks } from '~/server/common/sql-dan'

const db = useDrizzle(schema)
const tbl = {
  users: schema.users,
  scores: schema.scores,
  beatmaps: schema.beatmaps,
  sources: schema.sources,
}

const _sql = db.select({
  player: {
    id: tbl.users.id,
    name: tbl.users.name,
  },
  score: {
    id: sql`${tbl.scores.id}`.mapWith(String),
    accuracy: tbl.scores.accuracy,
  },
  beatmap: {
    id: tbl.beatmaps.id,
    md5: tbl.beatmaps.md5,
    title: tbl.beatmaps.title,
    artist: tbl.beatmaps.artist,
  },
})
  .from(tbl.scores)
  .innerJoin(tbl.beatmaps, eq(tbl.scores.mapMd5, tbl.beatmaps.md5))
  .innerJoin(tbl.sources, and(
    eq(tbl.beatmaps.server, tbl.sources.server),
    eq(tbl.beatmaps.setId, tbl.sources.id),
  ))
  .innerJoin(tbl.users, eq(tbl.scores.userId, tbl.users.id))
  .limit(10)
  .$dynamic()

export default defineEventHandler(async () => {
  return {
    cond: testData.achievements[0].cond,
    result: await _sql.where(danSQLChunks(testData.achievements[0].cond, testData.achievements, tbl)),
  }
})
