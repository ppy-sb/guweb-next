import { Mixin } from 'ts-mixer'
import { IdTransformable, ScoreIdTransformable } from './@extends'
import { type Dan, type DatabaseDan, type Requirement } from '~/def/dan'
import { type Pagination } from '~/def/pagination'
import { type UserCompact } from '~/def/user'

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
    requirement: Requirement
    scores: QualifiedScore<Id, ScoreId>[]
  }
}
export abstract class DanProvider<Id, ScoreId> extends Mixin(IdTransformable, ScoreIdTransformable) {
  abstract get(id: Id): Promise<DatabaseDan<Id>>
  abstract getQualifiedScores(id: Id): Promise<DanProvider.RequirementQualifiedScore<Id, ScoreId>[]>
  abstract delete(id: Id): Promise<void>

  abstract search(opt: { keyword: string } & Pagination): Promise<Array<DatabaseDan<Id>>>

  abstract runCustomDan(opt: Dan): Promise<Array<DanProvider.RequirementQualifiedScore<Id, ScoreId>>>

  abstract saveComposed(i: Dan | DatabaseDan<Id>, user: UserCompact<Id>): Promise<DatabaseDan<Id>>
}