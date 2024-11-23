import { Feature } from '~/def/features'
import { UserRole } from '~/def/user'

export { modes, rulesets, rankingSystems, leaderboardRankingSystems } from '~/def'

export const userRoles = [
  UserRole.Restricted,
  UserRole.Verified,
  UserRole.Supporter,
  UserRole.Alumni,
  UserRole.TournamentStaff,
  UserRole.BeatmapNominator,
  UserRole.Moderator,
  UserRole.Admin,
  UserRole.Owner,
  UserRole.Bot,
]

export {
  hasLeaderboardRankingSystem,
  hasRankingSystem,
  hasRuleset,
} from './guards'

export type Id = number
export type ScoreId = bigint

export const features = new Set<Feature>([
  Feature.Clan,
])
