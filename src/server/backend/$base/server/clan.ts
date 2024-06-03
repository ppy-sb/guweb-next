import { type ScoreId } from '..'
import type { Composition } from './@common'
import { IdTransformable } from './@extends'
import type { UserProvider } from './user'
import type { Mode, Rank, Ruleset } from '~/def'
import type { AbnormalStatus, NormalBeatmapWithMeta, RankingStatus } from '~/def/beatmap'
import type { ClanRelation } from '~/def/clan'
import type { LeaderboardRankingSystem } from '~/def/common'
import type { PaginatedResult } from '~/def/pagination'
import type { RankingSystemScore } from '~/def/score'

export abstract class ClanProvider<Id> extends IdTransformable {
  abstract search(opt: ClanProvider.SearchParam): Promise<ClanProvider.SearchResult<Id>>
  abstract detail(opt: ClanProvider.DetailParam<Id>): Promise<ClanProvider.DetailResult<Id>>
  abstract users(opt: ClanProvider.UsersParam<Id>): Promise<ClanProvider.UsersResult<Id>>
  abstract getClanRelation(opt: ClanProvider.ChangeRelationRequestParam<Id>): Promise<ClanRelation>
  abstract joinRequest(opt: ClanProvider.ChangeRelationRequestParam<Id>): Promise<ClanRelation>
  abstract leaveRequest(opt: ClanProvider.ChangeRelationRequestParam<Id>): Promise<ClanRelation>
  abstract bests(opt: ClanProvider.BestsParam<Id>): Promise<ClanProvider.BestsResult<Id>>
}

export namespace ClanProvider {

  export interface ClanCompact<Id> {
    id: Id
    name: string
    badge: string
    createdAt: Date
    owner: UserProvider.UserCompact<Id>
    avatarSrc?: string
    countUser: number
  }
  export interface ClanList<Id> extends ClanCompact<Id> {
    users: Pick<UserProvider.UserCompact<Id>, 'name' | 'avatarSrc'>[]
    sum: Record<Rank.PPv1 | Rank.PPv2, number> & Record<Rank.RankedScore | Rank.TotalScore, bigint>
  }
  export interface ClanDetail<Id> extends ClanCompact<Id> { }

  export interface MR {
    mode: Mode
    ruleset: Ruleset
    rankingSystem: LeaderboardRankingSystem
  }

  export interface SearchParam extends Composition.Pagination, MR {
    keyword: string
  }
  export interface DetailParam<Id> {
    id: Id
  }
  export interface BestsParam<Id> extends DetailParam<Id>, Composition.Pagination, MR { }

  export interface UsersParam<Id> extends DetailParam<Id>, Composition.Pagination { }
  export interface ChangeRelationRequestParam<Id> {
    userId: Id
    clanId: Id
  }

  export type SearchResult<Id> = PaginatedResult<ClanList<Id>>
  export type DetailResult<Id> = ClanProvider.ClanDetail<Id>
  export type UsersResult<Id> = PaginatedResult<UserProvider.UserCompact<Id>>
  export type BestsResult<Id> = PaginatedResult<{
    user: UserProvider.UserCompact<Id>
    score: RankingSystemScore<
        ScoreId,
        Id,
        Mode,
        LeaderboardRankingSystem,
        Exclude<RankingStatus, AbnormalStatus | RankingStatus.Unknown>
      > & {
      beatmap: NormalBeatmapWithMeta<Exclude<RankingStatus, AbnormalStatus | RankingStatus.Unknown>, Id, Id>
    }
  }>
}
