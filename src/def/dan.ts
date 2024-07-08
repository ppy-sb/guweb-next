import { Grade, type ScoreCompact } from './score'
import {
  type BeatmapCompact,
  BeatmapSource,
  type ReferencedBeatmapCompact,
} from './beatmap'
import { Mode } from '.'

enum Achievement {
  Pass,
  NoPause,
}

enum OP {
  OR,
  AND,
  Extends,
  BeatmapMd5Eq,
  NoPause,
  AccGte,
  ScoreGte,
  // ComboGte,
  // MissLte,
}

type ConcreteCond =
| readonly [OP.BeatmapMd5Eq, string]
| readonly [OP.AccGte, number]
| readonly [OP.ScoreGte, number]
| readonly [OP.NoPause]

type DeepCond =
| readonly [OP.AND, readonly Cond[]]
| readonly [OP.OR, readonly Cond[]]

type ExtendingCond = readonly [OP.Extends, Achievement]

type ComputedCond = DeepCond | ExtendingCond

type Cond = ConcreteCond | ComputedCond

type BaseCondOP = ConcreteCond[0]
type DeepCondOP = DeepCond[0]

type ExtendingCondOP = ExtendingCond[0]

interface Usecase<AB extends [Achievement, Cond]> {
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

type AchievementResult<AB extends [Achievement, Cond]> = AB extends [infer A, infer C extends Cond] ? {
  achievement: A
  result: boolean
  detail: DetailResult<C, AB>
} : never

type ValidatingScore = ScoreCompact<any, Mode.Mania> & {
  beatmap: BeatmapCompact<any, any>
  nonstop: boolean
}

function run_usecase<AB extends [Achievement, Cond]>(
  usecase: Usecase<AB>,
  score: ValidatingScore
): AchievementResult<AB>[] {
  const check_result: AchievementResult<AB>[] = []
  for (const [achievement, check_cond] of usecase.achievements) {
    const r = run_cond<AB[1], AB>(check_cond, usecase.achievements, score)
    check_result.push({
      achievement,
      result: r.result,
      detail: r,
    } as any)
  }
  return check_result
}

function run_cond<C extends Cond, AB extends [Achievement, Cond]>(
  cond: C,
  achievements: readonly AB[],
  score: ValidatingScore
): DetailResult<C, AB> {
  const [op, _maybeValue] = cond
  switch (op) {
    case OP.BeatmapMd5Eq: {
      return {
        cond,
        result: score.beatmap.md5 === _maybeValue,
        value: score.beatmap.md5,
      } as DetailResult<C, AB>
    }
    case OP.AccGte: {
      return {
        cond,
        result: score.accuracy >= _maybeValue,
        value: score.accuracy,
      } as DetailResult<C, AB>
    }
    case OP.ScoreGte: {
      return {
        cond,
        result: score.score >= _maybeValue,
        value: score.score,
      } as DetailResult<C, AB>
    }
    case OP.NoPause: {
      return {
        cond,
        result: score.nonstop,
        value: score.nonstop,
      } as DetailResult<C, AB>
    }
    case OP.AND: {
      const results = _maybeValue.map(c => run_cond(c, achievements, score))
      return {
        cond,
        result: results.every(r => r.result),
        detail: results,
      } as unknown as DetailResult<C, AB>
    }
    case OP.OR: {
      const results = _maybeValue.map(c =>
        run_cond(c, achievements, score)
      )
      return {
        cond,
        result: results.some(r => r.result),
        detail: results,
      } as unknown as DetailResult<C, AB>
    }
    case OP.Extends: {
      const _cond = achievements.find(
        ([achievement]) => achievement === _maybeValue
      )?.[1] ?? raiseError(`extending achievement (${Achievement[_maybeValue]}) not found`)
      const result = run_cond(
        _cond,
        achievements,
        score
      )
      return {
        cond: [OP.Extends, _maybeValue],
        result: result.result,
        detail: result,
      } as unknown as DetailResult<C, AB>
    }
    default:
      assertNotReachable(op)
  }
}
const score = {
  id: undefined,
  playedAt: new Date(),
  mods: [],
  score: 990000n,
  accuracy: 0.99,
  maxCombo: 1033,
  grade: Grade.F,
  hit: {
    max: 0,
    300: 0,
    200: 0,
    100: 0,
    50: 0,
    miss: 0,
  },
  beatmap: {
    // add missing properties
    id: 0,
    source: BeatmapSource.Bancho,
    properties: {
      bpm: 0,
      circleSize: 0,
      approachRate: 0,
      accuracy: 0,
      hpDrain: 0,
      count: {
        circles: 0,
        sliders: 0,
        spinners: 0,
      },
      totalLength: 0,
      maxCombo: 0,
      starRate: 0,
    },
    mode: Mode.Mania,
    md5: 'md5',
    version: 'version',
    creator: 'test_creator',
    lastUpdate: new Date(),
    foreignId: 0,
  } satisfies ReferencedBeatmapCompact<any, any>,
  nonstop: false,
}
const result = run_usecase(_1Dan, score)

function pretty_result(res: AchievementResult<[Achievement, Cond]>[], usecase: Usecase<[Achievement, Cond]>, score: ValidatingScore) {
  const msg: string[] = []

  msg.push(`usecase: ${usecase.name}`)
  msg.push(`description: ${usecase.name}`)
  msg.push(`score: Score(id=${score.id}, score=${score.score}, accuracy=${score.accuracy}, nonstop=${score.nonstop})`)
  msg.push(`beatmap: Beatmap(creator=${score.beatmap.creator}, version=${score.beatmap.version}, mode=${score.beatmap.mode}, md5=${score.beatmap.md5})`)

  return msg.concat(...res.map(res => fmtDetail(res, 1).flat()))
}

function sp(n: number) {
  return '  '.repeat(n)
}
function b(_b: boolean) {
  return _b ? '✓' : '✗'
}

function fmtDetail(detail: AchievementResult<[Achievement, Cond]> | DetailResult<ComputedCond, [Achievement, Cond]>, indent: number = 0) {
  let msg: string[] = []

  if ('achievement' in detail) {
    msg.push(`${sp(indent)}Achievement(${Achievement[detail.achievement]}):`)
    indent += 1
  }
  if ('cond' in detail) {
    msg.push(`${sp(indent)}${b(detail.result)} ${fmt_cond(detail.cond, (detail as any).value)}`)
    indent += 1
  }

  if ('detail' in detail) {
    if (Array.isArray(detail.detail)) {
      msg = msg.concat(...detail.detail.map(d => fmtDetail(d, indent + 1)))
    }
    else if (typeof detail.detail === 'object') {
      msg = msg.concat(fmtDetail(detail.detail as any, indent + 1))
    }
  }

  return msg
}

function fmt_cond(cond: Cond, value?: Cond[1]) {
  const [op, _maybeValue] = cond
  switch (op) {
    case OP.AccGte:
    case OP.BeatmapMd5Eq:
    case OP.ScoreGte:
      return `${OP[op]} ${_maybeValue}, ${value}`

    case OP.NoPause:
      return `${OP[op]}`

    case OP.Extends:
      return `${OP[op]} ${Achievement[_maybeValue]}`

    case OP.AND:
    case OP.OR:
      return `${OP[op]}`
  }
}

console.log(pretty_result(result, _1Dan, score).flat().join('\n'))
