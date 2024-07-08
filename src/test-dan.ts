/* eslint-disable no-console */
import { Grade, StableMod } from './def/score'
import { BeatmapSource, type ReferencedBeatmapCompact } from './def/beatmap'
import type { UserCompact } from './def/user'
import { Mode } from './def'
import {
  Achievement,
  type AchievementResult,
  type ComputedCond,
  type Cond,
  type DetailResult,
  OP,
  type Usecase,
  type ValidatingScore,
} from './def/dan'

const danBaseValidator = [
  OP.Commented,

  [
    OP.AND, [
      [OP.ModeEq, Mode.Mania],
      [OP.AccGte, 96],
      [OP.NOT,
        [
          OP.OR, [
            [OP.WithMod, StableMod.NoFail],
            [OP.WithMod, StableMod.Easy],
            [OP.WithMod, StableMod.HalfTime],
          ],
        ],
      ],
    ],
  ],

  'dan common',

] as const

const rf9 = {
  id: 1,
  name: 'rf9',
  description: 'rf9',
  achievements: [
    [
      Achievement.Pass,
      [
        OP.AND,
        [
          danBaseValidator,
          [OP.BeatmapMd5Eq, 'd25a4b3fde5bc764d259b1bac6a7671c'],
        ],
      ],
    ],
    [
      Achievement.NoPause,
      [OP.AND, [[OP.Extends, Achievement.Pass], [OP.NoPause]]],
    ],
  ],
} as const

const rf10 = {
  id: 1,
  name: 'rf10',
  description: 'rf10',
  achievements: [
    [
      Achievement.Pass,
      [
        OP.AND,
        [
          danBaseValidator,
          [OP.BeatmapMd5Eq, '1e0310955d28145ca287112360d162e8'],
        ],
      ],
    ],
    [
      Achievement.NoPause,
      [OP.AND, [[OP.Extends, Achievement.Pass], [OP.NoPause]]],
    ],
  ],
} as const

console.log(JSON.stringify(rf10))

const _10danMap = {
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
  md5: '1e0310955d28145ca287112360d162e8',
  version: '~10th~ (Marathon)',
  creator: 'DDMythical',
  lastUpdate: new Date(),
  foreignId: 0,
} satisfies ReferencedBeatmapCompact<any, any>

const _9danMap = {
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
  md5: 'd25a4b3fde5bc764d259b1bac6a7671c',
  version: '(9dan)',
  creator: 'DDMythical',
  lastUpdate: new Date(),
  foreignId: 0,
} satisfies ReferencedBeatmapCompact<any, any>

const scoreCompact = {
  mode: Mode.Mania,
  id: undefined,
  playedAt: new Date(),
  mods: [],
  score: 663138n,
  accuracy: 88.84,
  maxCombo: 492,
  grade: Grade.B,
  hit: {
    max: 3299,
    300: 2397,
    200: 1283,
    100: 273,
    50: 23,
    miss: 206,
  },
  nonstop: false,
  player: {
    id: 1,
    stableClientId: 1,
    name: 'Blue_Potion',
    safeName: 'Blue_Potion',
    roles: [],

  } satisfies UserCompact<any>,
}

const _10DanScore = {
  ...scoreCompact,
  beatmap: _10danMap,
}
const _9DanScore = {
  ...scoreCompact,
  beatmap: _9danMap,
}
const result10dan = run_usecase(rf10, _10DanScore)
const result9dan = run_usecase(rf9, _10DanScore)

function pretty_result(
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
    case OP.AccGte:
    case OP.BeatmapMd5Eq:
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
  }
}

function run_usecase<AB extends readonly [Achievement, Cond]>(
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

console.log(pretty_result(result10dan, rf10, _10DanScore).flat().join('\n'))
console.log('-------------------------')
console.log(pretty_result(result9dan, rf9, _9DanScore).flat().join('\n'))
