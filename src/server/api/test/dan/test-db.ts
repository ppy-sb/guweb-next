import { and, eq } from 'drizzle-orm'
import { rf9 } from '~/server/test-dan-def'
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
const sql = db.select()
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
  return await sql.where(danSQLChunks(rf9.achievements[0].cond, rf9.achievements, tbl))
})
