import type { OverallLeaderboardRankingSystem, PPRankingSystem } from './common'

export interface BaseRank {
  rank?: number
  rankHistory?: Record<string, number>

  countryRank?: number
  countryRankHistory?: number[]

  accuracy?: number
}

export type PPRank = BaseRank & {
  performance: number
  performanceHistory?: Record<string, number>
}

export type ScoreRank = BaseRank & {
  score: bigint | null
  scoreHistory?: Record<string, bigint>
}

export type UserModeRulesetStatistics<
  RS extends OverallLeaderboardRankingSystem,
> = {
  // TODO: Achievement
  // achievements: Achievement[]
  playCount: number
  playTime: number
  totalHits: number
  level: number
  maxCombo: number
  replayWatchedByOthers: number
  scoreRankComposition: {
    xh: number
    x: number
    sh: number
    s: number
    a: number
    b: number
    c: number
    d: number
    f: number
  }
} & {
  [R in RS]: R extends PPRankingSystem ? PPRank : ScoreRank;
}
