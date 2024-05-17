import enGB from './en-GB'
import frFR from './fr-FR'
import zhCN from './zh-CN'
import deDE from './de-DE'
import { Lang } from '~/def'

export const locales = {
  [Lang.enGB]: enGB,
  [Lang.frFR]: frFR,
  [Lang.zhCN]: zhCN,
  [Lang.deDE]: deDE,
} as const
