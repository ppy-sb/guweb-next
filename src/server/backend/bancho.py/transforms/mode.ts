import { match } from 'switch-pattern'
import { BanchoMode, BanchoPyMode } from '../enums'
import { Mode, Ruleset } from '~/def'
import type { ActiveMode, ActiveRuleset, AvailableRuleset } from '~/def/common'
import { GucchoError } from '~/def/messages'
import { type ServerRankingSystemDef } from '~/def/server'

export const BPyMode = {
  [BanchoPyMode.OsuStandard]: [Mode.Osu, Ruleset.Standard],
  [BanchoPyMode.TaikoStandard]: [Mode.Taiko, Ruleset.Standard],
  [BanchoPyMode.FruitsStandard]: [Mode.Fruits, Ruleset.Standard],
  [BanchoPyMode.ManiaStandard]: [Mode.Mania, Ruleset.Standard],
  [BanchoPyMode.OsuRelax]: [Mode.Osu, Ruleset.Relax],
  [BanchoPyMode.TaikoRelax]: [Mode.Taiko, Ruleset.Relax],
  [BanchoPyMode.FruitsRelax]: [Mode.Fruits, Ruleset.Relax],
  [BanchoPyMode.OsuAutopilot]: [Mode.Osu, Ruleset.Autopilot],
} as const

const ModeAvailableRulesets = Object.values(BPyMode).reduce((acc, cur) => {
  acc[cur[0]].push(cur[1])
  return acc
}, {
  [Mode.Osu]: [],
  [Mode.Taiko]: [],
  [Mode.Fruits]: [],
  [Mode.Mania]: [],
} as Record<ActiveMode, ActiveRuleset[]>)

// const BPyModeEntries = strictEntries(BPyMode)
const BPyModeEntries = Object.entries(BPyMode)

export function toBanchoPyMode(
  mode: ActiveMode,
  ruleset: ActiveRuleset,
): BanchoPyMode {
  const patterns = match([mode, ruleset] as const)

  const str = BPyModeEntries.find(([_, mr]) => patterns.exact(mr))?.[0]
  if (!str) {
    throwGucchoError(GucchoError.ModeOrRulesetNotSupported)
  }
  return Number.parseInt(str)
}
type UnionModeRulesetTuple = {
  [M in keyof ServerRankingSystemDef]: readonly [M, AvailableRuleset<M>]
}[keyof ServerRankingSystemDef]
export function fromBanchoPyMode<BMode extends BanchoPyMode>(input: BMode): UnionModeRulesetTuple {
  return BPyMode[input]
}

export function assertIsBanchoPyMode(val: number): asserts val is BanchoPyMode {
  if (!(val in BPyMode)) {
    throw new Error('unknown bancho.py mode')
  }
}

export function getModeAvailableRulesets(mode: Mode) {
  return ModeAvailableRulesets[mode]
}

export function toBanchoMode(mode: Mode) {
  switch (mode) {
    case Mode.Osu:
      return BanchoMode.Osu
    case Mode.Taiko:
      return BanchoMode.Taiko
    case Mode.Fruits:
      return BanchoMode.Fruits
    case Mode.Mania:
      return BanchoMode.Mania
  }
}
export function fromBanchoMode(mode: BanchoMode) {
  switch (mode) {
    case BanchoMode.Osu:
      return Mode.Osu
    case BanchoMode.Taiko:
      return Mode.Taiko
    case BanchoMode.Fruits:
      return Mode.Fruits
    case BanchoMode.Mania:
      return Mode.Mania
  }
}
