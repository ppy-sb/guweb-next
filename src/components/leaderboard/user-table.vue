<script lang="ts" setup>
import type { inferRouterOutputs } from '@trpc/server'
import type { SwitcherState } from '../app/mode-switcher.vue'
import { Rank } from '~/def'
import type { LeaderboardRankingSystem } from '~/def/common'
import { CountryCode } from '~/def/country-code'
import type { ComponentLeaderboard } from '~/def/leaderboard'
import type { AppRouter } from '~/server/trpc/routers'
import { createUserpageRoute } from '~/store/userpage'

type RouterOutput = inferRouterOutputs<AppRouter>

type Leaderboard = NonNullable<RouterOutput['rank']['leaderboard']>[number]
const props = defineProps<{
  user: Leaderboard['user']
  inThisLeaderboard: ComponentLeaderboard<string>['inThisLeaderboard']
  sort: LeaderboardRankingSystem
  switcherState: SwitcherState
}>()

const { t } = useI18n()
const addCommas = createNumberFormatter()
const scoreFormat = createScoreFormatter()

const option: Intl.NumberFormatOptions = {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}
const formatter = new Intl.NumberFormat(undefined, option)
</script>

<template>
  <tr class="font-medium">
    <th scope="row" class="px-4 py-3 font-bold">
      <p class="text-base text-gbase-900 dark:text-gbase-100" :data-rank="props.inThisLeaderboard.rank?.toString()">
        #{{ props.inThisLeaderboard.rank }}
      </p>
    </th>
    <th scope="row">
      <div class="flex items-center justify-center w-full">
        <div class="flex-shrink-0">
          <img
            :alt="t(localeKey.country(props.user.flag || CountryCode.Unknown))" class="w-6"
            :src="getFlagURL(props.user.flag)"
          >
        </div>
      </div>
    </th>
    <th scope="row">
      <div class="flex items-center gap-2">
        <div class="flex object-cover w-8 overflow-hidden aspect-square mask mask-squircle">
          <img class="m-auto" :src="user.avatarSrc" :alt="user.name">
        </div>
        <nuxt-link-locale
          class="text-base"
          :to="createUserpageRoute({ ...switcherState, handle: `@${user.safeName}` })"
          :class="useUserRoleColor(user)"
        >
          {{ user.name }}
        </nuxt-link-locale>
      </div>
    </th>
    <td class="font-bold text-right">
      <template v-if="sort === Rank.PPv2">
        <span class="font-mono text-base">{{ addCommas(props.inThisLeaderboard[Rank.PPv2] || 0) }}</span> <span>pp</span>
      </template>
      <template v-else-if="sort === Rank.PPv1">
        <span class="font-mono text-base">{{ addCommas(props.inThisLeaderboard[Rank.PPv1] || 0) }}</span> <span>pp</span>
      </template>
      <template v-else-if="sort in props.inThisLeaderboard">
        <span class="font-mono text-base">{{ scoreFormat(props.inThisLeaderboard[sort] || 0) }}</span>
      </template>
    </td>
    <td class="text-right opacity-80">
      <span class="font-mono text-base">{{ formatter.format((props.inThisLeaderboard.accuracy || 0) / 100).slice(0, -1) }}</span><span>%</span>
    </td>
    <td class="text-right opacity-80">
      <span class="font-mono text-base">{{ addCommas(props.inThisLeaderboard.playCount || 0) }}</span>
    </td>
  </tr>
</template>

<style lang="postcss">
tr [data-rank="1"] {
  @apply text-[color-mix(in_oklab,oklch(var(--a)),black_7%)]
}

tr [data-rank="2"] {

  @apply text-[color-mix(in_oklab,oklch(var(--p)),black_7%)]
}

tr [data-rank="3"] {

  @apply text-[color-mix(in_oklab,oklch(var(--s)),black_7%)]
}
</style>
