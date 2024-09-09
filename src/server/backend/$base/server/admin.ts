import { type Mode } from 'node:fs'
import { IdTransformable } from './@extends'
import type { Composition } from './@common'
import { type ComputedUserRole } from '~/utils/common'
import type { UserClan, UserCompact, UserOptional, UserSecrets, UserStatistic } from '~/def/user'
import { type ModeRulesetScoreStatistic, type UserModeRulesetStatistics } from '~/def/statistics'
import { Rank, type Ruleset } from '~/def'
import { type LeaderboardRankingSystem } from '~/def/common'

export abstract class AdminProvider<Id> extends IdTransformable {
  abstract userList(
    query: Partial<UserCompact<Id> & Pick<UserOptional, 'email' | 'status'>> &
    Partial<UserSecrets> &
    Composition.Pagination
  ): Promise<
    readonly [
      number,
      Array<
        UserCompact<Id> &
        Pick<UserOptional, 'email' | 'status'> & {
          registeredAt: Date
          lastActivityAt: Date
          clan?: UserClan<Id>
        }
      >,
    ]
  >
  abstract userDetail(query: {
    id: Id
  }): Promise<UserCompact<Id> & UserOptional>
  abstract updateUserDetail(
    updater: { role: ComputedUserRole },
    query: { id: Id },
    updateFields: Partial<UserCompact<Id> & UserOptional>
  ): Promise<UserCompact<Id> & UserOptional>

  abstract calcUserStatistics(query: { id: Id; mode: Mode; ruleset: Ruleset }): Promise<ModeRulesetScoreStatistic>
  abstract getStoredUserStatistics(query: { id: Id; mode: Mode; ruleset: Ruleset }): Promise<ModeRulesetScoreStatistic>
}
