import type { LocaleMessageValue, LocaleMessages, VueMessageType } from '@nuxtjs/i18n/dist/runtime/composables'
import type { DeepPartial } from '@trpc/server'
import type { CountryCode } from '~/def/country-code'
import type { GucchoError } from '~/def/messages'
import type { Mail } from '~/def/mail'
import type { RankingStatus } from '~/def/beatmap'
import type { Scope, UserRole } from '~/def/user'
import { Lang, type Rank } from '~/def'
import type { ActiveMode, ActiveRuleset } from '~/def/common'
import type { OP, Requirement } from '~/def/dan'

type Title =
| 'leaderboard'
| 'status'
| 'settings'
| 'relations'
| 'userpage'
| 'admin-panel'
| 'user-management'
| 'logs'
| 'articles'
| 'clans'
| 'account-recovery'
| 'dans'

type KGlobal =
| 'logout'
| 'login'
| 'register'
| 'pp'
| 'player'
| 'rank'
| 'mods'
| 'played-at'
| 'acc'
| 'accuracy'
| 'max-combo'
| 'play-count'
| 'beatmapsets'
| 'beatmaps'
| 'users'
| 'session'
| 'wip'
| 'password'
| 'email'
| 'otp'
| 'verify'
type KFooter =
| 'about'
| 'resources'

export interface GlobalI18n extends PathAccessibleObject {
  server: {
    name: string
  }
  footer: Record<KFooter, string>

  mode: Record<ActiveMode, string>
  ruleset: Record<ActiveRuleset, string>
  rank: Record<Rank, string>

  beatmap: {
    status: Record<RankingStatus, string>
  }
  role: Record<UserRole, string>
  scope: Record<Scope, string>
  title: Record<
    Title,
    string
  >
  global: Record<KGlobal, string>

  service: Record<string, string>

  error: Record<GucchoError, string>

  dan: {
    cond: Record<OP, string>
    requirement: Record<Requirement, string>
  }

  country: Record<CountryCode, string>

  mail: Record<Mail.Variant, {
    subject: string
    content: string
  }>
}

interface T { [x: string]: LocaleMessages<VueMessageValue> }
export interface AllLocales extends T {
  [lang in Lang]: lang extends Lang.enGB ? GlobalI18n : DeepPartial<GlobalI18n>
}
