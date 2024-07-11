import { BeatmapSource } from '~/def/beatmap'
import {
  Achievement,
  type AchievementBinding,
  type AchievementResult,
  type BaseCond,

  type ConcreteCondBase,
  type Cond,
  type DetailResult,
  OP,
  type Remarked,
  type Usecase,
  type ValidatingScore,
  type WrappedCond,
} from '~/def/dan'
import { StableMod } from '~/def/score'
import type { Mode } from '~/def'

export function pretty_result(
  res: AchievementResult[],
  usecase: Usecase,
  score: ValidatingScore
) {
  const msg: string[] = []

  msg.push(`usecase: ${usecase.name}`)
  msg.push(`description: ${usecase.name}`)
  msg.push(
    `score: Score(player=${score.player.name}(${score.player.id}), score=${score.score}, accuracy=${score.accuracy}, nonstop=${score.nonstop})`
  )
  msg.push(
    `beatmap: Beatmap(creator=${score.beatmap.creator}, version=${score.beatmap.version}, mode=${score.beatmap.mode}, md5=${score.beatmap.md5})`
  )

  return msg.concat(...res.map(res => fmtDetail(res, 1).flat()))
}

function sp(n: number) {
  return '  '.repeat(n)
}
function b(_b: boolean) {
  return _b ? '✓' : '✗'
}

function fmtDetail(
  detail: AchievementResult | DetailResult<Cond>,
  indent: number = 0
) {
  let msg: string[] = []

  if ('achievement' in detail) {
    msg.push(`${sp(indent)}Achievement(${Achievement[detail.achievement]}):`)
    indent += 1
  }
  if ('cond' in detail) {
    msg.push(
      `${sp(indent)}${b(detail.result)} ${fmt_cond(detail, 'value' in detail ? detail.value : undefined)}`
    )
    if (detail.cond.op === OP.Extends) {
      return msg
    }
    indent += 1
  }

  if ('detail' in detail) {
    if (Array.isArray(detail.detail)) {
      msg = msg.concat(...detail.detail.map(d => fmtDetail(d, indent + 1)))
    }
    else if (typeof detail.detail === 'object') {
      msg = msg.concat(fmtDetail(detail.detail as DetailResult<Cond>, indent + 1))
    }
  }

  return msg
}

export function fmt_cond<D extends DetailResult>(detail: D, value: D extends { value: infer V } ? V : undefined) {
  const { cond } = detail
  const { op } = cond

  switch (op) {
    case OP.BanchoBeatmapIdEq:
    case OP.BeatmapMd5Eq:
    case OP.AccGte:
    case OP.ScoreGte:
    case OP.ModeEq:
    {
      const { val } = cond
      return `${OP[op]} ${val}, ${value}`
    }

    case OP.Remark:
    {
      const { remark } = cond
      return `Plug(${remark})`
    }

    case OP.WithStableMod:
    {
      const { val } = cond
      return `${OP[op]} ${StableMod[val]}`
    }

    // op without attribute
    case OP.NoPause:
      return `${OP[op]}`

    // referenced op
    case OP.Extends:
    {
      const { val } = cond
      return `${OP[op]} Achievement(${Achievement[val]})`
    }

    // deep op
    case OP.AND:
    case OP.OR:
    case OP.NOT:
      return `${OP[op]}`

    default:
      // return '???'
      assertNotReachable(op)
  }
}

export function run_usecase<AB extends AchievementBinding<Achievement, Cond>>(
  usecase: Usecase<AB>,
  score: ValidatingScore
): AchievementResult<AB>[] {
  const check_result: AchievementResult<AB>[] = []
  const caches: DetailResult<AB['cond'], AB>[] = []
  for (const { achievement, cond: check_cond } of usecase.achievements) {
    const r = run_cond<AB['cond'], AB>(
      check_cond,
      usecase.achievements,
      score,
      caches
    )
    caches.push(r)
    check_result.push({
      achievement,
      result: r.result,
      detail: r,
    } as any)
  }
  return check_result
}

export function run_cond<C extends Cond, AB extends AchievementBinding<Achievement, Cond>>(
  cond: C,
  achievements: readonly AB[],
  score: ValidatingScore,
  results: DetailResult<AB['cond'], AB>[] = []
): DetailResult<C, AB> {
  const { op } = cond
  switch (op) {
    case OP.BeatmapMd5Eq: {
      const { val } = cond
      return {
        cond,
        result: score.beatmap.md5 === val,
        value: score.beatmap.md5,
      } as DetailResult<C, AB>
    }
    case OP.BanchoBeatmapIdEq: {
      if (score.beatmap.source !== BeatmapSource.Bancho) {
        return {
          cond,
          result: false,
          value: null,
        } as DetailResult<C, AB>
      }
      const { val } = cond
      return {
        cond,
        result: score.beatmap.foreignId === val,
        value: score.beatmap.foreignId,
      } as DetailResult<C, AB>
    }
    case OP.AccGte: {
      const { val } = cond
      return {
        cond,
        result: score.accuracy >= val,
        value: score.accuracy,
      } as DetailResult<C, AB>
    }
    case OP.ScoreGte: {
      const { val } = cond
      return {
        cond,
        result: score.score >= val,
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
    case OP.WithStableMod: {
      const { val } = cond
      return {
        cond,
        result: score.mods.includes(val),
        value: val,
      } as DetailResult<C, AB>
    }
    case OP.ModeEq: {
      const { val } = cond
      return {
        cond,
        result: score.mode === val,
        value: val,
      } as DetailResult<C, AB>
    }
    case OP.Remark: {
      const { remark, cond: _cond } = cond
      const result = run_cond(_cond, achievements, score, results)
      return {
        cond,
        remark,
        result: result.result,
        detail: result,
      } as unknown as DetailResult<C, AB>
    }
    case OP.NOT: {
      const { cond: not } = cond
      const result = run_cond(not, achievements, score, results)
      return {
        cond,
        result: !result.result,
        detail: result,
      } as unknown as DetailResult<C, AB>
    }
    case OP.AND: {
      const _results = cond.cond.map(c =>
        run_cond(c, achievements, score, results)
      )
      return {
        cond,
        result: _results.every(r => r.result),
        detail: _results,
      } as unknown as DetailResult<C, AB>
    }
    case OP.OR: {
      const _results = cond.cond.map(c =>
        run_cond(c, achievements, score, results)
      )
      return {
        cond,
        result: _results.some(r => r.result),
        detail: _results,
      } as unknown as DetailResult<C, AB>
    }
    case OP.Extends: {
      const { val } = cond
      const _cond
        = achievements.find(
          ({ achievement }) => achievement === val
        )?.cond
        ?? raiseError(
          `extending achievement (${Achievement[val]}) not found`
        )
      const cached = results.find(i => i.cond === _cond)
      if (cached) {
        return {
          cond,
          result: cached.result,
          detail: cached,
        } as unknown as DetailResult<C, AB>
      }
      const result = run_cond(_cond, achievements, score, results)
      return {
        cond,
        result: result.result,
        detail: result,
      } as unknown as DetailResult<C, AB>
    }
    default:
      assertNotReachable(op)
  }
}

export function $usecase<AB extends AchievementBinding<Achievement, Cond>>(name: string, opts: { id: number; description: string; achievements: readonly AB[] }): Usecase<AB> {
  return { name, ...opts }
}
export function $achievement<A extends Achievement, C extends Cond>(achievement: A, cond: C): AchievementBinding<A, C> {
  return { achievement, cond }
}

export function $remark<C>(value: string, cond: C): Remarked<OP.Remark, C> {
  return { op: OP.Remark, remark: value, cond }
}

export function $or<C extends Cond[]>(...cond: C): WrappedCond<OP.OR, C> {
  return { op: OP.OR, cond }
}

export function $and<C extends Cond[]>(...cond: C): WrappedCond<OP.AND, C> {
  return { op: OP.AND, cond }
}

export function $not<C extends Cond>(cond: C): WrappedCond<OP.NOT, C> {
  return { op: OP.NOT, cond }
}
export function $modeEq<C extends Mode>(val: C): ConcreteCondBase<OP.ModeEq, C> {
  return { op: OP.ModeEq, val }
}

export function $extendsAchievement<C extends Achievement>(val: C): ConcreteCondBase<OP.Extends, C> {
  return { op: OP.Extends, val }
}

export function $banchoBeatmapIdEq<C>(val: C): ConcreteCondBase<OP.BanchoBeatmapIdEq, C> {
  return { op: OP.BanchoBeatmapIdEq, val }
}

export function $beatmapMd5Eq<C>(val: C): ConcreteCondBase<OP.BeatmapMd5Eq, C> {
  return { op: OP.BeatmapMd5Eq, val }
}

export function $noPause(): BaseCond<OP.NoPause> {
  return { op: OP.NoPause }
}

export function $accGte<C>(val: C): ConcreteCondBase<OP.AccGte, C> {
  return { op: OP.AccGte, val }
}

export function $scoreGte<C>(val: C): ConcreteCondBase<OP.ScoreGte, C> {
  return { op: OP.ScoreGte, val }
}

export function $withStableMod<C extends StableMod>(mod: C): ConcreteCondBase<OP.WithStableMod, C> {
  return { op: OP.WithStableMod, val: mod }
}
