import { type SQL, and, eq, gte, inArray, not, or, sql } from 'drizzle-orm'
import { toBanchoPyMode } from '../../bancho.py/transforms'
import { hasRuleset } from '../'
import { Mode, Ruleset } from '~/def'
import type * as schema from '~/server/backend/bancho.py/drizzle/schema'
import {
  type Cond,
  OP,
  type Requirement,
  type RequirementCondBinding,
} from '~/def/dan'

export function danSQLChunks<C extends Cond, AB extends RequirementCondBinding<Requirement, Cond>>(
  cond: C,
  achievements: readonly AB[],
  table: {
    scores: typeof schema.scores
    beatmaps: typeof schema.beatmaps
    sources: typeof schema.sources
  }
): SQL | undefined {
  const { type } = cond
  switch (type) {
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
    case OP.StableModIncludeAny: {
      const { val } = cond
      return sql`${table.scores.mods} & ${val} > 0`
    }
    case OP.StableModIncludeAll: {
      const { val } = cond
      return sql`${table.scores.mods} & ${val} = ${val}`
    }
    case OP.ModeEq: {
      const { val } = cond
      return or(
        eq(table.scores.mode, toBanchoPyMode(val, Ruleset.Standard)),
        // cannot use .if() due to toBanchoPyMode will throw Error first
        hasRuleset(val, Ruleset.Relax) ? eq(table.scores.mode, toBanchoPyMode(val, Ruleset.Relax)) : undefined,
        hasRuleset(val, Ruleset.Autopilot) ? eq(table.scores.mode, toBanchoPyMode(val, Ruleset.Autopilot)) : undefined,
      )
    }
    case OP.RulesetEq: {
      const { val } = cond
      return inArray(
        table.scores.mode,
        [
          toBanchoPyMode(Mode.Osu, val),
          toBanchoPyMode(Mode.Taiko, val),
          toBanchoPyMode(Mode.Fruits, val),
          toBanchoPyMode(Mode.Mania, val),
        ]
      )
    }
    case OP.Remark: {
      return danSQLChunks(cond.cond, achievements, table)
    }
    case OP.NOT: {
      const _cond = danSQLChunks(cond.cond, achievements, table)
      if (!_cond) {
        return undefined
      }
      return not(_cond)
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
        ({ type: achievement }) => achievement === val
      )?.cond
        ?? raiseError(
          `extending achievement (${val}) not found`
        )
      if (_cond === cond) {
        raiseError('loop detected')
      }
      return danSQLChunks(_cond, achievements, table)
    }
    default:
      assertNotReachable(type)
  }
}
