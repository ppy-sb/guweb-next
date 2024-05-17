import type { DeepPartial } from '@trpc/server'
import type { GlobalI18n } from '~/locales/@types'

export default {
  landing: {
    content: `Wir sind ein osu! private Server, der von Grund auf mit vielen einzigartigen Funktionen gebaut wurde, die anderswo nicht zu finden sind!
    - für weitere Informationen, schaue dir bancho.py und Guccho auf GitHub an
    - wir sind vollständig Open Source!`,
  },
  service: {
  },
} as const satisfies DeepPartial<GlobalI18n>
