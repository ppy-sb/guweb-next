import { type AllLocales } from '../@types'
import enGB from './en-GB'
import frFR from './fr-FR'
import zhCN from './zh-CN'
import deDE from './de-DE'
import { Lang } from '~/def'

export default {
  [Lang.enGB]: enGB,
  [Lang.frFR]: frFR,
  [Lang.zhCN]: zhCN,
  [Lang.deDE]: deDE,
} satisfies AllLocales as AllLocales
