import { Mixin } from 'ts-mixer'
import type { ClanProvider } from './clan'
import { IdTransformable, ScoreIdTransformable } from './@extends'
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem, PPRankingSystem } from '~/def/common'
import type { RulesetScore } from '~/def/score'
import type { UserCompact } from '~/def/user'

export namespace ScoreProvider {

  export type ScoreWithUser<TScoreId, TId, TA extends ActiveMode = ActiveMode, TR extends ActiveRuleset = ActiveRuleset, TRS extends PPRankingSystem = PPRankingSystem> = RulesetScore<TScoreId, TId, TA, TR, TRS> & {
    user: UserCompact<TId>
  }

  export interface SearchQuery<TId> {
    mode: ActiveMode
    ruleset: ActiveRuleset
    rankingSystem: LeaderboardRankingSystem
    user?: Partial<Pick<UserCompact<TId>, 'id' | 'name' | 'safeName' | 'flag'>> & {
      clan?: Partial<Pick<ClanProvider.ClanCompact<TId>, 'id' | 'name' | 'badge'>>
    }
    beatmap?: {
      id: TId
    }
  }

  export interface SearchId<TScroreId> {
    id: TScroreId
  }

  // export interface RecentScoresParam<Id, M extends ActiveMode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem> extends Composition.Pagination {
  //   mode: M
  //   ruleset: R
  //   rankingSystem: RS
  // }
  // export interface TopScoresParam<Id, M extends ActiveMode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem> extends Composition.Pagination {
  //   mode: M
  //   ruleset: R
  //   rankingSystem: RS
  // }
  // export interface BestScoresParam<Id, M extends ActiveMode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem> extends Composition.Pagination {
  //   mode: M
  //   ruleset: R
  //   rankingSystem: RS
  // }

}

export abstract class ScoreProvider<TScoreId, TId> extends Mixin(IdTransformable, ScoreIdTransformable) {
  abstract id(id: TScoreId): Promise<
    | (RulesetScore<TScoreId, TId, ActiveMode, ActiveRuleset, PPRankingSystem> & {
      user: UserCompact<TId>
    })
  >
  abstract findOne(opt: ScoreProvider.SearchQuery<TId>): Promise<ScoreProvider.ScoreWithUser<TScoreId, TId>>
  abstract findMany(opt: ScoreProvider.SearchQuery<TId>): Promise<ScoreProvider.ScoreWithUser<TScoreId, TId>[]>

  // abstract recents(opt: ClanProvider.RecentScoresParam<Id, M extends Mode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem>): Promise<ScoreP<Id, Mode, R, RS>[]>
  // abstract tops(opt: ClanProvider.TopScoresParam<Id, M extends Mode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem>): Promise<ScoreP<Id, Mode, R, RS>[]>
  // abstract bests(opt: ClanProvider.BestScoresParam<Id, M extends Mode, R extends AvailableRuleset<M>, RS extends LeaderboardRankingSystem>): Promise<ScoreP<Id, Mode, R, RS>[]>
}
