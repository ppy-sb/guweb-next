import { Mixin } from 'ts-mixer'
import { IdTransformable, ScoreIdTransformable } from './@extends'
import { type Cond, type Dan, type DatabaseDan, type Requirement } from '~/def/dan'
import { type Pagination } from '~/def/pagination'
import { type UserCompact } from '~/def/user'

export abstract class DanProvider<Id, ScoreId> extends Mixin(IdTransformable, ScoreIdTransformable) {
  abstract get(id: Id): Promise<DatabaseDan<Id>>
  abstract delete(id: Id): Promise<void>

  abstract search(opt: { keyword: string } & Pagination): Promise<Array<DatabaseDan<Id>>>

  abstract runCustomDan(opt: Dan): Promise<Array<{
    requirement: Requirement
    cond: Cond
    results: {
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
    }[]
  }>>

  abstract saveComposed(i: Dan | DatabaseDan<Id>, user: UserCompact<Id>): Promise<DatabaseDan<Id>>
}
