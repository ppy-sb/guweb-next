import { $enum } from 'ts-enum-util'
import { BeatmapSource } from '~/def/beatmap'
import {
  type ConcreteCond,
  type Cond,
  type CondBase,
  type Dan,

  type DetailResult,
  OP,
  type Remarked,
  Requirement,
  type RequirementCondBinding,
  type RequirementResult,
  type ValidatingScore,
  type WrappedCond,
} from '~/def/dan'
import { StableMod } from '~/def/score'
import type { Mode } from '~/def'

const $op = $enum(OP)
const $req = $enum(Requirement)

export function pretty_result(
  res: RequirementResult[],
  usecase: Dan,
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

  return msg.concat(...res.map(res => fmtDanResult(res, 1).flat()))
}

function sp(n: number) {
  return '  '.repeat(n)
}
function b(_b: boolean) {
  return _b ? '✓' : '✗'
}

export function fmtDanResult(
  detail: RequirementResult | DetailResult<Cond>,
  indent: number = 0
) {
  let msg: string[] = []

  if ('type' in detail) {
    msg.push(`${sp(indent)}Achievement(${$req.getKeyOrDefault(detail.type)}):`)
    indent += 1
  }
  if ('cond' in detail) {
    msg.push(
      `${sp(indent)}${b(detail.result)} ${fmt_cond(detail, 'value' in detail ? detail.value : undefined)}`
    )
    if (detail.cond.type === OP.Extends) {
      return msg
    }
    indent += 1
  }

  if ('detail' in detail) {
    if (Array.isArray(detail.detail)) {
      msg = msg.concat(...detail.detail.map(d => fmtDanResult(d, indent + 1)))
    }
    else if (typeof detail.detail === 'object') {
      msg = msg.concat(fmtDanResult(detail.detail as DetailResult<Cond>, indent + 1))
    }
  }

  return msg
}

export function fmt_cond<D extends DetailResult>(detail: D, value: D extends { value: infer V } ? V : undefined) {
  const { cond } = detail
  const { type } = cond

  switch (type) {
    case OP.BanchoBeatmapIdEq:
    case OP.BeatmapMd5Eq:
    case OP.AccGte:
    case OP.ScoreGte:
    case OP.ModeEq:
    {
      const { val } = cond
      return `${$op.getKeyOrDefault(type)} ${val}, ${value}`
    }

    case OP.RulesetEq: {
      const { val } = cond
      return `${$req.getKeyOrDefault(type)} ${val}, ${value}`
    }

    case OP.Remark:
    {
      const { remark } = cond
      return `Plug(${remark})`
    }

    case OP.WithStableMod:
    {
      const { val } = cond
      return `${$op.getKeyOrDefault(type)} ${StableMod[val]}`
    }

    // op without attribute
    case OP.NoPause:
      return `${$op.getKeyOrDefault(type)}`

    // referenced op
    case OP.Extends:
    {
      const { val } = cond
      return `${$op.getKeyOrDefault(type)} Achievement(${$req.getKeyOrDefault(val)})`
    }

    // deep op
    case OP.AND:
    case OP.OR:
    case OP.NOT:
      return `${$op.getKeyOrDefault(type)}`

    default:
      // return '???'
      assertNotReachable(type)
  }
}

export function run_usecase<AB extends RequirementCondBinding<Requirement, Cond>>(
  usecase: Dan<AB>,
  score: ValidatingScore
): RequirementResult<AB>[] {
  const check_result: RequirementResult<AB>[] = []
  const caches: DetailResult<AB['cond'], AB>[] = []
  for (const { type: achievement, cond: check_cond } of usecase.requirements) {
    const r = run_cond<AB['cond'], AB>(
      check_cond,
      usecase.requirements,
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

export function run_cond<C extends Cond, AB extends RequirementCondBinding<Requirement, Cond>>(
  cond: C,
  achievements: readonly AB[],
  score: ValidatingScore,
  results: DetailResult<AB['cond'], AB>[] = []
): DetailResult<C, AB> {
  const { type } = cond
  switch (type) {
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
    case OP.RulesetEq: {
      const { val } = cond
      return {
        cond,
        result: score.ruleset === val,
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
          ({ type: achievement }) => achievement === val
        )?.cond
        ?? raiseError(
          `extending achievement (${$req.getKeyOrDefault(val)}) not found`
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
      assertNotReachable(type)
  }
}

export function $dan<AB extends RequirementCondBinding<Requirement, Cond>>(name: string, opts: { id: number; description: string; requirements: readonly AB[] }): Dan<AB> {
  return { name, ...opts }
}
export function $requirement<A extends Requirement, C extends Cond>(achievement: A, cond: C): RequirementCondBinding<A, C> {
  return { type: achievement, cond }
}

export function $remark<C>(value: string, cond: C): Remarked<OP.Remark, C> {
  return { type: OP.Remark, remark: value, cond }
}

export function $or<C extends Cond[]>(...cond: C): WrappedCond<OP.OR, C> {
  return { type: OP.OR, cond }
}

export function $and<C extends Cond[]>(...cond: C): WrappedCond<OP.AND, C> {
  return { type: OP.AND, cond }
}

export function $not<C extends Cond>(cond: C): WrappedCond<OP.NOT, C> {
  return { type: OP.NOT, cond }
}
export function $modeEq<C extends Mode>(val: C): ConcreteCond<OP.ModeEq, C> {
  return { type: OP.ModeEq, val }
}

export function $extendsAchievement<C extends Requirement>(val: C): ConcreteCond<OP.Extends, C> {
  return { type: OP.Extends, val }
}

export function $banchoBeatmapIdEq<C>(val: C): ConcreteCond<OP.BanchoBeatmapIdEq, C> {
  return { type: OP.BanchoBeatmapIdEq, val }
}

export function $beatmapMd5Eq<C>(val: C): ConcreteCond<OP.BeatmapMd5Eq, C> {
  return { type: OP.BeatmapMd5Eq, val }
}

export function $noPause(): CondBase<OP.NoPause> {
  return { type: OP.NoPause }
}

export function $accGte<C>(val: C): ConcreteCond<OP.AccGte, C> {
  return { type: OP.AccGte, val }
}

export function $scoreGte<C>(val: C): ConcreteCond<OP.ScoreGte, C> {
  return { type: OP.ScoreGte, val }
}

export function $withStableMod<C extends StableMod>(mod: C): ConcreteCond<OP.WithStableMod, C> {
  return { type: OP.WithStableMod, val: mod }
}

export function validateCond<T extends Cond>(cond: T): T {
  switch (cond.type) {
    case OP.BanchoBeatmapIdEq:
    case OP.BeatmapMd5Eq:
    case OP.AccGte:
    case OP.ScoreGte:
    case OP.ModeEq:
    case OP.WithStableMod:
    case OP.RulesetEq:
    case OP.Extends:
      return { type: cond.type, val: cond.val } as T

    case OP.Remark:
      return { type: cond.type, remark: cond.remark, cond: validateCond(cond.cond) } as T

    case OP.NoPause:
      return { type: cond.type } as T
    case OP.NOT:
      return { type: cond.type, cond: validateCond(cond.cond) } as T

    case OP.OR:
    case OP.AND:
      return { type: cond.type, cond: cond.cond.filter(Boolean).map(validateCond) } as unknown as T

    default: assertNotReachable(cond)
  }
}

export function validateUsecase<U extends Dan>(compose: U): U {
  return {
    ...compose,
    requirements: compose.requirements.map(i => ({
      ...i,
      cond: validateCond(i.cond),
    })),
  }
}
