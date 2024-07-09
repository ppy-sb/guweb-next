import { type ScoreCompact, type StableMod } from './score'
import {
  type BeatmapCompact,
} from './beatmap'
import type { UserCompact } from './user'
import { type Mode } from '.'

export enum Achievement {
  Pass,
  NoPause,
  Custom,
}

export enum OP {
  Commented,
  OR,
  AND,
  NOT,
  ModeEq,
  Extends,
  BanchoBeatmapIdEq,
  BeatmapMd5Eq,
  NoPause,
  AccGte,
  ScoreGte,
  WithMod,
  // ComboGte,
  // MissLte,
}

interface BaseCond<O> {
  op: O
}

interface ConcreteCondBase<O, V> extends BaseCond<O> {
  val: V
}

interface WrappedCond<O, C> extends BaseCond<O> {
  cond: C
}

interface Remarked<O, V> extends WrappedCond<O, V> {
  remark: string
}

type UConcreteCond =
  | ConcreteCondBase<OP.BanchoBeatmapIdEq, number>
  | ConcreteCondBase<OP.BeatmapMd5Eq, string>
  | ConcreteCondBase<OP.AccGte, number>
  | ConcreteCondBase<OP.ScoreGte, number>
  | ConcreteCondBase<OP.WithMod, StableMod>
  | ConcreteCondBase<OP.ModeEq, Mode>
  | BaseCond<OP.NoPause>

type UWrappedCond =
  | WrappedCond<OP.NOT, Cond>
  | Remarked<OP.Commented, Cond>

type UDeepCond =
  | WrappedCond<OP.AND, readonly Cond[]>
  | WrappedCond<OP.OR, readonly Cond[]>

type ExtendingCond = ConcreteCondBase<OP.Extends, Achievement>
export type UComputedCond = UDeepCond | ExtendingCond
export type Cond =
  | UConcreteCond
  | UComputedCond
  | UWrappedCond

type BaseCondOP = UConcreteCond['op']
type DeepCondOP = UDeepCond['op']
type WrappingCondOP = UWrappedCond['op']
type ExtendingCondOP = ExtendingCond['op']

export interface AchievementBinding<A, C> {
  achievement: A
  cond: C
}

export interface Usecase<AB extends AchievementBinding<Achievement, Cond> = AchievementBinding<Achievement, Cond>> {
  id: number
  name: string
  description: string

  achievements: readonly AB[]
}

export type DetailResult<
  C extends Cond = Cond,
  AB extends AchievementBinding<Achievement, Cond> = AchievementBinding<Achievement, Cond>,
> =
C extends ConcreteCondBase<infer R extends ExtendingCondOP, infer T extends Achievement>
  ? {
      cond: C
      result: boolean
      detail: AchievementResult<AB>
    }
  : C extends UConcreteCond
    ? {
        cond: C
        result: boolean
        value: C extends ConcreteCondBase<infer _O, infer _V> ? _V : never
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

export type AchievementResult<AB extends AchievementBinding<Achievement, Cond> = AchievementBinding<Achievement, Cond>> =
  AB extends AchievementBinding<infer A extends Achievement, infer C extends Cond>
    ? {
        achievement: A
        result: boolean
        detail: DetailResult<C, AB>
      }
    : never

export type ValidatingScore = ScoreCompact<any, Mode.Mania> & {
  beatmap: BeatmapCompact<any, any>
  nonstop: boolean
  player: UserCompact<any>
  mode: Mode
}
