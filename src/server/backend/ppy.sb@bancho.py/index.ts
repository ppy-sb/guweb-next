import { features as banchoPyFeatures } from '../bancho.py'
import { Feature } from '~/def/features'

export {
  hasLeaderboardRankingSystem,
  hasRankingSystem,
  hasRuleset,
  modes,
  rulesets,
  rankingSystems,
  leaderboardRankingSystems,
  userRoles,
} from '../bancho.py'
export type { Id, ScoreId } from '../bancho.py'

export const features = new Set<Feature>([...banchoPyFeatures, Feature.Dan])
