import { Lang } from '~/def'

export function every<T>(input: T) {
  return {
    [Lang.enGB]: {
      ...input,
    },
    [Lang.frFR]: {
      ...input,
    },
    [Lang.zhCN]: {
      ...input,
    },
    [Lang.deDE]: {
      ...input,
    },
  }
}
