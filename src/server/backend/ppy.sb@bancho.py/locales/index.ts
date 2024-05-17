import enGB from './en-GB'
import zhCN from './zh-CN'
import frFR from './fr-FR'
import deDE from './de-DE'
import { Lang } from '~/def'

export const locales = {
  [Lang.enGB]: enGB,
  [Lang.frFR]: frFR,
  [Lang.zhCN]: zhCN,
  [Lang.deDE]: deDE,
} as const
