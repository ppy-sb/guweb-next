import { toBanchoPyMode } from '../adapters/bancho.py/backend-clients/enums'
import { Ruleset, Mode } from '~/types/common'

export const modeToGulag = toBanchoPyMode

export const getFlagURL = (flag: string) => {
  let url = 'https://osu.ppy.sh/assets/images/flags/'
  flag = flag.toUpperCase()
  for (let i = 0; i < flag.length; i++) {
    url += (flag.charCodeAt(i) + 127397).toString(16)
    url += i !== flag.length - 1 ? '-' : '.svg'
  }
  return url
}
export const
  scoreFormat = (score: bigint | number) => {
    return Intl.NumberFormat(undefined, { notation: 'compact' }).format(score)
  }

export const addCommas = (nStr: number | bigint) => {
  return Intl.NumberFormat().format(nStr)
}

export const forbiddenMode = (mods: Ruleset, mode: Mode) => {
  if (mods === 'relax' && mode === 'mania') {
    return true
  } else if (mods === 'autopilot' && mode !== 'osu') {
    return true
  } else {
    return false
  }
}

export const forbiddenMods = (mode: Mode, mods: Ruleset) => {
  if (mode === 'mania' && mods === 'relax') {
    return true
  } else if (mode !== 'osu' && mods === 'autopilot') {
    return true
  } else {
    return false
  }
}