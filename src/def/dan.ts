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

type ConcreteCond =
  | readonly [OP.BanchoBeatmapIdEq, number]
  | readonly [OP.BeatmapMd5Eq, string]
  | readonly [OP.AccGte, number]
  | readonly [OP.ScoreGte, number]
  | readonly [OP.WithMod, StableMod]
  | readonly [OP.ModeEq, Mode]
  | readonly [OP.NoPause]

type DeepCond =
  | readonly [OP.NOT, Cond]
  | readonly [OP.AND, readonly Cond[]]
  | readonly [OP.OR, readonly Cond[]]

type ExtendingCond = readonly [OP.Extends, Achievement]
export type ComputedCond = DeepCond | ExtendingCond
export type Cond =
  | ConcreteCond
  | ComputedCond
  | readonly [OP.Commented, Cond, string]

type BaseCondOP = ConcreteCond[0]
type DeepCondOP = DeepCond[0]
type ExtendingCondOP = ExtendingCond[0]

export interface Usecase<AB extends readonly [Achievement, Cond] = readonly [Achievement, Cond]> {
  id: number
  name: string
  description: string

  achievements: readonly AB[]
}

export type DetailResult<
  C extends Cond = Cond,
  AB extends readonly [Achievement, Cond] = readonly [Achievement, Cond],
> =
  C extends [OP.Commented, infer C extends Cond, any] ?
    DetailResult<C> & { remark: string }
    : C extends ConcreteCond
      ? {
          cond: C
          result: boolean
          value: C extends [infer _OP, infer _V] ? _V : never
        }
      : C extends readonly [
        infer R extends ExtendingCondOP,
        infer T extends Achievement,
      ]
        ? {
            cond: readonly [R, T]
            result: boolean
            detail: AchievementResult<AB>
          }
        : C extends readonly [
          infer R extends DeepCondOP,
          infer T extends Cond,
        ]
          ? {
              cond: readonly [R, T]
              result: boolean
              detail: DetailResult<T, AB>
            }
          : C extends readonly [
            infer R extends DeepCondOP,
            infer T extends readonly Cond[],
          ]
            ? {
                cond: readonly [R, T]
                result: boolean
                detail: {
                  [k in keyof T]: DetailResult<T[k], AB>;
                }
              }
            : never

export type AchievementResult<AB extends readonly [Achievement, Cond] = [Achievement, Cond]> =
  AB extends [infer A extends Achievement, infer C extends Cond]
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
