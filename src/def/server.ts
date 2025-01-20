import type { Brand } from './internal-utils'
import type {
  ActiveMode,
  ActiveRuleset,
  AvailableRuleset,
  LeaderboardRankingSystem,
  RankingSystem,

} from './common'

export type ServerRankingSystemDef = {
  [M in ActiveMode]: {
    [R in AvailableRuleset<M>]: {
      leaderboardRankingSystem: readonly LeaderboardRankingSystem[]
      rankingSystem: readonly RankingSystem[]
    }
  }
}

export type UnionModeRuleset = {
  [M in keyof ServerRankingSystemDef]: { mode: M; ruleset: AvailableRuleset<M> };
}[keyof ServerRankingSystemDef]

export type HasRuleset = <M extends ActiveMode>(
  mode: M,
  ruleset: ActiveRuleset
) => ruleset is AvailableRuleset<M>

export type HasRankingSystem = <
  M extends ActiveMode,
  R extends AvailableRuleset<M>,
>(
  mode: M,
  ruleset: R,
  rankingSystem: Brand<string> | RankingSystem
) => rankingSystem is RankingSystem

export type HasLeaderboardRankingSystem = <
  M extends ActiveMode,
  R extends AvailableRuleset<M>,
>(
  mode: M,
  ruleset: R,
  rankingSystem: Brand<string> | LeaderboardRankingSystem
) => rankingSystem is LeaderboardRankingSystem
