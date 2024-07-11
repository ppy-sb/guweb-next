import rf6th from '~/common/achievements/reform-6th'
import { pretty_result, run_usecase } from '~/common/utils/dan'
import { Mode } from '~/def'
import { BeatmapSource, type ReferencedBeatmapCompact } from '~/def/beatmap'
import { Grade } from '~/def/score'
import type { UserCompact } from '~/def/user'

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

export default defineEventHandler(async (_event) => {
  const result10dan = run_usecase(rf6th, _10DanScore)

  const str = pretty_result(result10dan, rf6th, _10DanScore).flat().join('\n')
})
