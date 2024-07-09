import { BeatmapSource } from '~/def/beatmap'
import {
  Achievement,
  type AchievementResult,
  type ComputedCond,
  type Cond,
  type DetailResult,
  OP,
  type Usecase,
  type ValidatingScore,
} from '~/def/dan'
import { StableMod } from '~/def/score'

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

export function sp(n: number) {
  return '  '.repeat(n)
}
export function b(_b: boolean) {
  return _b ? '✓' : '✗'
}

export function fmtDetail(
  detail: AchievementResult | DetailResult<ComputedCond>,
  indent: number = 0
) {
  let msg: string[] = []

  if ('achievement' in detail) {
    msg.push(`${sp(indent)}Achievement(${Achievement[detail.achievement]}):`)
    indent += 1
  }
  if ('cond' in detail) {
    msg.push(
      `${sp(indent)}${b(detail.result)} ${fmt_cond(
        detail.cond,
        (detail as any).value,
        (detail as any).remark
      )}`
    )
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

function fmt_cond(cond: Cond, value: Cond[1], remark?: string) {
  const [op, _maybeValue] = cond
  switch (op) {
    case OP.BanchoBeatmapIdEq:
    case OP.BeatmapMd5Eq:
    case OP.AccGte:
    case OP.ScoreGte:
      return `${OP[op]} ${_maybeValue}, ${value}`

    case OP.Commented:
      return `Plug(${remark})`

    case OP.WithMod:
      return `${OP[op]} ${StableMod[_maybeValue]}`

    case OP.ModeEq:
      return `${OP[op]} ${_maybeValue}, ${value}`

    // op without attribute
    case OP.NoPause:
      return `${OP[op]}`

    // referenced op
    case OP.Extends:
      return `${OP[op]} ${Achievement[_maybeValue]}`

    // deep op
    case OP.AND:
    case OP.OR:
    case OP.NOT:
      return `${OP[op]}`

    default:
      assertNotReachable(op)
  }
}

export function run_usecase<AB extends readonly [Achievement, Cond]>(
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

function run_cond<C extends Cond, AB extends readonly [Achievement, Cond]>(
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
    case OP.BanchoBeatmapIdEq: {
      if (score.beatmap.source !== BeatmapSource.Bancho) {
        return {
          cond,
          result: false,
          value: null,
        } as DetailResult<C, AB>
      }
      return {
        cond,
        result: score.beatmap.foreignId === _maybeValue,
        value: score.beatmap.foreignId,
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
    case OP.WithMod: {
      return {
        cond,
        result: score.mods.includes(_maybeValue),
        value: _maybeValue,
      } as DetailResult<C, AB>
    }
    case OP.ModeEq: {
      return {
        cond,
        result: score.mode === _maybeValue,
        value: _maybeValue,
      } as DetailResult<C, AB>
    }
    case OP.Commented: {
      const result = run_cond(_maybeValue, achievements, score)
      return {
        cond,
        result: result.result,
        detail: result,
        remark: cond[2],
      } as unknown as DetailResult<C, AB>
    }
    case OP.NOT: {
      const result = run_cond(_maybeValue, achievements, score)
      return {
        cond,
        result: !result.result,
        detail: result,
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
      const results = _maybeValue.map(c => run_cond(c, achievements, score))
      return {
        cond,
        result: results.some(r => r.result),
        detail: results,
      } as unknown as DetailResult<C, AB>
    }
    case OP.Extends: {
      const _cond
        = achievements.find(
          ([achievement]) => achievement === _maybeValue
        )?.[1]
        ?? raiseError(
          `extending achievement (${Achievement[_maybeValue]}) not found`
        )
      const result = run_cond(_cond, achievements, score)
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
