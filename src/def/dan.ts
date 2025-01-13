import { type ScoreCompact, type StableMod } from './score'
import {
  type BeatmapCompact,
} from './beatmap'
import type { UserCompact } from './user'
import { type Mode, type Ruleset } from '.'

export enum Requirement {
  Pass = 'pass',
  NoPause = 'no-pause',
}

export enum OP {
  Remark = 'rem',
  OR = 'or',
  AND = 'and',
  NOT = 'not',
  ModeEq = 'mode-eq',
  RulesetEq = 'ruleset-eq',
  Extends = 'extends',
  BanchoBeatmapIdEq = 'bancho/bm-id-eq',
  BeatmapMd5Eq = 'bm-md5-eq',
  NoPause = 'no-pause',
  AccGte = 'acc-gte',
  ScoreGte = 'score-gte',
  WithStableMod = 'stable/with-mod',
}

export interface CondBase<O> {
  type: O
}

export interface ConcreteCond<O, V> extends CondBase<O> {
  val: V
}

export interface WrappedCond<O, C> extends CondBase<O> {
  cond: C
}

export interface Remarked<O, V> extends WrappedCond<O, V> {
  remark: string
}

export type UConcreteCond =
  | ConcreteCond<OP.BanchoBeatmapIdEq, number>
  | ConcreteCond<OP.BeatmapMd5Eq, string>
  | ConcreteCond<OP.AccGte, number>
  | ConcreteCond<OP.ScoreGte, number>
  | ConcreteCond<OP.WithStableMod, StableMod>
  | ConcreteCond<OP.ModeEq, Mode>
  | ConcreteCond<OP.RulesetEq, Ruleset>
  | CondBase<OP.NoPause>

type UWrappedCond =
  | WrappedCond<OP.NOT, Cond>
  | Remarked<OP.Remark, Cond>

type UDeepCond =
  | WrappedCond<OP.AND, readonly Cond[]>
  | WrappedCond<OP.OR, readonly Cond[]>

type ExtendingCond = ConcreteCond<OP.Extends, Requirement>
export type UComputedCond = UDeepCond | ExtendingCond
export type Cond =
  | UConcreteCond
  | UComputedCond
  | UWrappedCond

export type ConcreteCondOP = UConcreteCond['type']
type DeepCondOP = UDeepCond['type']
type WrappingCondOP = UWrappedCond['type']
type ExtendingCondOP = ExtendingCond['type']

interface WithId<I> {
  id: I
}

export interface RequirementCondBinding<R, C> {
  type: R
  cond: C
}

export interface DatabaseRequirementCondBinding<I, R, C> extends RequirementCondBinding<R, C>, WithId<I> {}

export interface Dan<RCBinding extends RequirementCondBinding<Requirement, Cond> = RequirementCondBinding<Requirement, Cond>> {
  name: string
  description: string

  requirements: readonly RCBinding[]
}

export interface DatabaseDan<I, RCBinding extends DatabaseRequirementCondBinding<I, Requirement, Cond> = DatabaseRequirementCondBinding<I, Requirement, Cond>> extends Dan<RCBinding>, WithId<I> {}

export type DetailResult<
  C extends Cond = Cond,
  AB extends RequirementCondBinding<Requirement, Cond> = RequirementCondBinding<Requirement, Cond>,
> =
C extends ConcreteCond<infer R extends ExtendingCondOP, infer T extends Requirement>
  ? {
      cond: C
      result: boolean
      detail: RequirementResult<AB>
    }
  : C extends UConcreteCond
    ? {
        cond: C
        result: boolean
        value: C extends ConcreteCond<infer _O, infer _V> ? _V : never
      }
    : C extends WrappedCond<infer R extends WrappingCondOP, infer T extends Cond>
      ? {
          cond: C
          result: boolean
          detail: DetailResult<T, AB>
        }
      : C extends WrappedCond<infer R extends DeepCondOP, infer T extends readonly Cond[]>
        ? {
            cond: WrappedCond<R, T>
            result: boolean
            detail: {
              [k in keyof T]: DetailResult<T[k], AB>;
            }
          }
        : never

export type DatabaseDetailResult<I, C extends Cond = Cond, RCBinding extends DatabaseRequirementCondBinding<I, Requirement, Cond> = DatabaseRequirementCondBinding<I, Requirement, Cond>> = DetailResult<C, RCBinding> & WithId<I>

export type RequirementResult<AB extends RequirementCondBinding<Requirement, Cond> = RequirementCondBinding<Requirement, Cond>> =
  AB extends RequirementCondBinding<infer A extends Requirement, infer C extends Cond>
    ? {
        type: A
        result: boolean
        detail: DetailResult<C, AB>
      }
    : never

export type DatabaseRequirementResult<I, RCBinding extends DatabaseRequirementCondBinding<I, Requirement, Cond> = DatabaseRequirementCondBinding<I, Requirement, Cond>> = RequirementResult<RCBinding> & WithId<I>

export type ValidatingScore = ScoreCompact<any, Mode> & {
  beatmap: BeatmapCompact<any, any>
  nonstop: boolean
  player: Pick<UserCompact<any>, 'id' | 'name' | 'safeName'>
  mode: Mode
  ruleset: Ruleset
}
