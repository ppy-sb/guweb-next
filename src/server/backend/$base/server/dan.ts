import { Mixin } from 'ts-mixer'
import { IdTransformable, ScoreIdTransformable } from './@extends'
import { type Dan, type DatabaseDan, type Requirement } from '~/def/dan'
import { type PaginatedResult, type Pagination } from '~/def/pagination'
import { type UserCompact } from '~/def/user'
import type { Mode, Ruleset } from '~/def'
import { type ScoreCompact } from '~/def/score'
import { type BaseBeatmapset, type BeatmapCompact } from '~/def/beatmap'

export namespace DanProvider {
  export interface QualifiedScore<Id, ScoreId> {
    player: {
      id: Id
      name: string
    }
    score: {
      id: ScoreId
      accuracy: number
      score: number
    }
    beatmap: {
      id: Id
      md5: string
      artist: string
      title: string
      version: string
    }
  }

  export interface RequirementQualifiedScore<Id, ScoreId> {
    // requirement: Requirement
    count: number
    scores: QualifiedScore<Id, ScoreId>[]
  }

  export interface UserDanClearedScore<Id, ScoreId> {
    score: Pick<ScoreCompact<ScoreId, Mode>, 'id' | 'score' | 'accuracy' | 'maxCombo' | 'grade' | 'mods' | 'playedAt' > & {
      mode: Mode
      ruleset: Ruleset
      beatmap: Pick<BeatmapCompact<Id, Id>, 'id' | 'creator' | 'mode' | 'version' | 'md5'> & {
        beatmapset: BaseBeatmapset<Id>
      }
    }
    dan: Pick<DatabaseDan<Id>, 'id' | 'name'>
    requirements: Requirement[]
  }
}
export abstract class DanProvider<Id, ScoreId> extends Mixin(IdTransformable, ScoreIdTransformable) {
  abstract search(opt: { keyword: string; mode?: Mode; ruleset?: Ruleset; rulesetDefaultsToStandard?: boolean } & Pagination): Promise<PaginatedResult<DatabaseDan<Id>>>
  abstract get(id: Id): Promise<DatabaseDan<Id>>
  abstract delete(id: Id): Promise<void>
  abstract getQualifiedScores(id: Id, requirement: Requirement, page: number, perPage: number): Promise<DanProvider.RequirementQualifiedScore<Id, ScoreId>>
  abstract runCustomDan(opt: Dan): Promise<Array<DanProvider.RequirementQualifiedScore<Id, ScoreId>>>
  abstract saveComposed(i: Dan | DatabaseDan<Id>, user: Pick<UserCompact<Id>, 'id'>): Promise<DatabaseDan<Id>>
  abstract countUserClearedDans(opt: { user: Pick<UserCompact<Id>, 'id'> }): Promise<number>
  abstract getUserClearedDans(opt: { user: Pick<UserCompact<Id>, 'id'>; page: number; perPage: number }): Promise<Array<DanProvider.UserDanClearedScore<Id, ScoreId>>>
  abstract exportAll(): Promise<DatabaseDan<Id>[]>
}
