import { type UIConfig } from './src/def/config.d'
import PackageJSON from './package.json'
import { Rank } from './src/def'

export default {
  baseUrl: 'dev.ppy.sb',
  version: PackageJSON.version,
  leaderboardRankingSystem: {
    [Rank.PPv2]: {
      userpage: {
        show: 'tab',
      },
    },
    [Rank.PPv1]: {
      userpage: {
        show: 'dropdown',
      },
    },
    [Rank.RankedScore]: {
      userpage: {
        show: 'tab',
      },
    },
    [Rank.TotalScore]: {
      userpage: {
        show: 'tab',
      },
    },
  },
} satisfies UIConfig