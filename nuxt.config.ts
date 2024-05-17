import { fileURLToPath } from 'node:url'
import { pick } from 'lodash-es'
import backend from './guccho.backend.config'
import ui from './guccho.ui.config'
import './scripts/ensure-env'
import { Lang } from './src/def'
import { CountryCode } from './src/def/country-code'
import { Constant } from './src/server/common/constants'

const uiConf = pick(ui, ['baseUrl', 'brand', 'footerLink', 'iconLinks', 'leaderboardRankingSystem'])

export default defineNuxtConfig({
  // Disable server-side rendering: https://go.nuxtjs.dev/ssr-mode
  ssr: true,

  srcDir: 'src/',

  build: {
    transpile: ['trpc-nuxt'],
  },

  routeRules: {
    '/_nuxt/**': {
      headers: {
        // number here chosen for its recognisability not for use
        'cache-control': 'public, max-age=86400, immutable',
      },
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/image',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
    'nuxt-icon',
  ],

  alias: {
    $active: fileURLToPath(new URL(`./src/server/backend/${backend.use}`, import.meta.url)),
    $base: fileURLToPath(new URL('./src/server/backend/$base', import.meta.url)),
  },

  vite: {
  },

  typescript: {
    strict: true,
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
    '~/assets/styles/main.scss',
    '~/components/content/styles/typography.scss',
    '~/assets/styles/transitions.scss',
    '~/assets/styles/daisyui.scss',
  ],

  app: {
    pageTransition: {
      name: 'slide',
      mode: 'out-in',
    },
    layoutTransition: {
      name: 'slide',
      mode: 'out-in', // default
    },
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
      meta: [
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      bodyAttrs: {
        // @ts-expect-error it's fine
        tabindex: '-1',
      },
    },
  },
  runtimeConfig: {
    public: uiConf,
  },
  watch: [
    /\.\/guccho.(ui|backend).config.ts/,
    './daisyui.themes.ts',
    './tailwind.config.ts',
  ],

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: Lang.enGB,
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: Constant.CookieLangKey as string,
      redirectOn: 'root', // recommended
    },
    locales: [
      {
        code: Lang.enGB,
        flag: CountryCode.UnitedKingdom,
        name: 'English (International)',
      },
      {
        code: Lang.frFR,
        flag: CountryCode.France,
        name: 'French (France)',
      },
      {
        code: Lang.deDE,
        flag: CountryCode.Germany,
        name: 'Deutsch (Deutschland)',
      },
      {
        code: Lang.zhCN,
        flag: CountryCode.China,
        name: '简体中文 (中国)',
      },
    ],
    experimental: {
      localeDetector: './src/server/localeDetector.ts',
    },
  },

  experimental: {
    componentIslands: true,
    // viewTransition: true,
    // asyncContext: true,
    renderJsonPayloads: true,
    headNext: true,
    inlineRouteRules: true,
    typedPages: true,
  },

  devtools: {
    timeline: {
      enabled: true,
    },
  },

  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },
  },
})
