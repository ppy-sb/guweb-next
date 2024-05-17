import type {
  ActiveMode,
  ActiveRuleset,
  LeaderboardPPRankingSystem,
  LeaderboardScoreRankingSystem,
  PPRankingSystem,
  ScoreRankingSystem,
} from './common'

export enum Lang {
  enGB = 'en-GB',
  zhCN = 'zh-CN',
  frFR = 'fr-FR',
  deDE = 'de-DE',
}

export enum Relationship {
  Friend,
  Blocked,
}
export enum MutualRelationship {
  MutualFriend,
  MutualBlocked,
}

export enum Rank {
  PPv1 = 'ppv1',
  PPv2 = 'ppv2',
  Score = 'score',
  RankedScore = 'rankedScore',
  TotalScore = 'totalScore',
}

export const PPRank = {
  PPv1: Rank.PPv1,
  PPv2: Rank.PPv2,
} as const

export const ScoreRank = {
  Score: Rank.Score,
} as const

export const LeaderboardScoreRank = {
  RankedScore: Rank.RankedScore,
  TotalScore: Rank.TotalScore,
} as const

const ppRankingSystem = [Rank.PPv1, Rank.PPv2] as const
const scoreRankingSystem = [Rank.Score] as const

const leaderboardPPRankingSystem = ppRankingSystem
const leaderboardScoreRankingSystem = [
  LeaderboardScoreRank.RankedScore,
  LeaderboardScoreRank.TotalScore,
] as const

const defaultConfigure = {
  leaderboardRankingSystem: {
    ppRankingSystem: leaderboardPPRankingSystem,
    scoreRankingSystem: leaderboardScoreRankingSystem,
  },
  rankingSystem: {
    ppRankingSystem,
    scoreRankingSystem,
  },
}

export enum Mode {
  Osu = 'osu',
  Taiko = 'taiko',
  Fruits = 'fruits',
  Mania = 'mania',
}

export enum Ruleset {
  Standard = 'standard',
  Relax = 'relax',
  Autopilot = 'autopilot',
}

export const rankingSystemDef = {
  [Mode.Osu]: {
    [Ruleset.Standard]: defaultConfigure,
    [Ruleset.Relax]: defaultConfigure,
    [Ruleset.Autopilot]: defaultConfigure,
  },
  [Mode.Taiko]: {
    [Ruleset.Standard]: defaultConfigure,
    [Ruleset.Relax]: defaultConfigure,
  },
  [Mode.Fruits]: {
    [Ruleset.Standard]: defaultConfigure,
    [Ruleset.Relax]: defaultConfigure,
  },
  [Mode.Mania]: {
    [Ruleset.Standard]: defaultConfigure,
  },
} as const

export type ModeRulesetRankingSystemDef = typeof rankingSystemDef

const _mode = new Set<ActiveMode>()
const _ruleset = new Set<ActiveRuleset>()

const _ppRankingSystem = new Set<PPRankingSystem>()
const _scoreRankingSystem = new Set<ScoreRankingSystem>()

const _leaderboardPPRankingSystem = new Set<LeaderboardPPRankingSystem>()
const _leaderboardScoreRankingSystem = new Set<LeaderboardScoreRankingSystem>()

for (const key of Object.keys(rankingSystemDef)) {
  _mode.add(key as unknown as ActiveMode)
  const ruleset = rankingSystemDef[key as unknown as ActiveMode]
  for (const rule in ruleset) {
    _ruleset.add(rule as unknown as ActiveRuleset)
    const rankingSystemDefs = ruleset[rule as unknown as keyof typeof ruleset]

    rankingSystemDefs.leaderboardRankingSystem.ppRankingSystem.map(rs =>
      _leaderboardPPRankingSystem.add(rs),
    )
    rankingSystemDefs.leaderboardRankingSystem.scoreRankingSystem.map(rs =>
      _leaderboardScoreRankingSystem.add(rs),
    )

    rankingSystemDefs.rankingSystem.ppRankingSystem.map(rs =>
      _ppRankingSystem.add(rs),
    )
    rankingSystemDefs.rankingSystem.scoreRankingSystem.map(rs =>
      _scoreRankingSystem.add(rs),
    )
  }
}

export const modes = [..._mode] as const
export const rulesets = [..._ruleset] as const

export const ppRankingSystems = [..._ppRankingSystem] as const
export const scoreRankingSystems = [..._scoreRankingSystem] as const
export const rankingSystems = [...ppRankingSystems, ...scoreRankingSystems] as const

export const leaderboardPPRankingSystems = [..._leaderboardPPRankingSystem] as const
export const leaderboardScoreRankingSystems = [
  ..._leaderboardScoreRankingSystem,
] as const
export const leaderboardRankingSystems = [
  ...leaderboardPPRankingSystems,
  ...leaderboardScoreRankingSystems,
] as const
