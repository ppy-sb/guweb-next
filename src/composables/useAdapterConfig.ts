import { supportedGrandLeaderboardRankingSystems, supportedModes, supportedRulesets } from '~/server/trpc/config'

export default () => {
  return {
    supportedModes,
    supportedRulesets,
    supportedGrandLeaderboardRankingSystems,
  }
}
