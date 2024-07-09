import { type SQL, and, eq, gte, not, or, sql } from 'drizzle-orm'
import { toBanchoPyMode } from '../backend/bancho.py/transforms'
import { Ruleset } from '../../def'
import type * as schema from '~/server/backend/bancho.py/drizzle/schema'
import {
  Achievement,
  type AchievementBinding, type Cond,
  OP,
} from '~/def/dan'

export function danSQLChunks<C extends Cond, AB extends AchievementBinding<Achievement, Cond>>(
  cond: C,
  achievements: readonly AB[],
  table: {
    scores: typeof schema.scores
    beatmaps: typeof schema.beatmaps
    sources: typeof schema.sources
  }
): SQL {
  const { op } = cond
  switch (op) {
    case OP.BeatmapMd5Eq: {
      const { val } = cond
      return eq(table.beatmaps.md5, val)
    }
    case OP.BanchoBeatmapIdEq: {
      return and(
        eq(table.beatmaps.server, 'osu!'),
        eq(table.beatmaps.id, cond.val)
      )!
    }
    case OP.AccGte: {
      const { val } = cond
      return gte(table.scores.accuracy, val)
    }
    case OP.ScoreGte: {
      const { val } = cond
      return gte(table.scores.score, val)
    }
    case OP.NoPause: {
      return sql`false`
    }
    case OP.WithMod: {
      const { val } = cond
      return sql`${table.scores.mods} & ${val} = ${val}`
    }
    case OP.ModeEq: {
      const { val } = cond
      const anyRuleset = toBanchoPyMode(val, Ruleset.Standard)
      return eq(table.scores.mode, anyRuleset)
    }
    case OP.Commented: {
      return danSQLChunks(cond.cond, achievements, table)
    }
    case OP.NOT: {
      return not(danSQLChunks(cond.cond, achievements, table))
    }
    case OP.AND: {
      const sqlChunks = cond.cond.map(c => danSQLChunks(c, achievements, table))
      return and(...sqlChunks)!
    }
    case OP.OR: {
      const sqlChunks = cond.cond.map(c => danSQLChunks(c, achievements, table))
      return or(...sqlChunks)!
    }
    case OP.Extends: {
      const { val } = cond
      const _cond = achievements.find(
        ({ achievement }) => achievement === val
      )?.cond
        ?? raiseError(
          `extending achievement (${Achievement[val]}) not found`
        )
      return danSQLChunks(_cond, achievements, table)
    }
    default:
      assertNotReachable(op)
  }
}
