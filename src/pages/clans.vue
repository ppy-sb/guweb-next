<script lang="ts" setup>
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem } from '~/def/common'
import { Rank } from '~/def'
import { Paginated } from '~/def/pagination'

const app = useNuxtApp()
const config = useRuntimeConfig()
const { supportedModes, supportedRulesets } = useAdapterConfig()
const pp = createPPFormatter()
const score = createScoreFormatter()
const { t } = useI18n()
const route = useRoute('clans')

const availableRankingSystems = Object.keys(config.public.leaderboardRankingSystem)

const { mode: pMode, ruleset: pRuleset, ranking: pRankingSystem, keyword: pKeyword } = route.query

const mode = (
  (isString(pMode) && includes(pMode, supportedModes))
    ? pMode
    : supportedModes[0]
) as ActiveMode

const ruleset = (
  (isString(pRuleset) && includes(pRuleset, supportedRulesets))
    ? pRuleset
    : supportedRulesets[0]
) as ActiveRuleset

const rankingSystem = (
  (isString(pRankingSystem) && availableRankingSystems.includes(pRankingSystem))
    ? pRankingSystem
    : availableRankingSystems[0]
) as LeaderboardRankingSystem

const selected = ref<Required<SwitcherPropType<LeaderboardRankingSystem>>>({
  mode,
  ruleset,
  rankingSystem,
})

const query = reactive({
  keyword: pKeyword?.toString(),
})

const mergeQuery = computed(() => ({
  mode: selected.value.mode,
  ruleset: selected.value.ruleset,
  rankingSystem: selected.value.rankingSystem,
  keyword: query.keyword,
}))
const { data: res } = await app.$client.clan.search.useQuery(mergeQuery)

useHead({
  title: app.$i18n.t(localeKey.title.clans.__path__),
  titleTemplate: title => `${title} - ${app.$i18n.t(localeKey.server.name.__path__)}`,
})
</script>

<i18n lang="yaml">
en-GB:
  search-text: Search badges, names...
  search: Search
  avg: Average

zh-CN:
  search-text: 搜索标签、名称 ...
  search: 搜索
  avg: 平均

# TODO fr translation
# fr-FR:

de-DE:
  search-text: Badges, Namen suchen ...
  search: Suchen
  avg: Durchschnitt
</i18n>

<template>
  <div class="container px-2 mx-auto custom-container !max-w-screen-md lg:px-0">
    <header-simple-title-with-sub
      id="desc"
      :title="$t(localeKey.title.clans.__path__)"
      :subtitle="
        selected.mode
          && selected.ruleset
          && selected.rankingSystem
          && `${$t(localeKey.mode(selected.mode))} - ${
            $t(localeKey.ruleset(selected.ruleset))
          } | ${$t(localeKey.rankingSystem(selected.rankingSystem))}`
      "
    >
      <app-mode-switcher
        v-model="selected"
        :show-sort="true"
      />
    </header-simple-title-with-sub>

    <form :action="useRequestURL().href" method="get" @submit.prevent="noop">
      <label for="keyword" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
      <div class="relative">
        <div class="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
        </div>
        <input id="keyword" v-model="query.keyword" name="keyword" type="search" class="block w-full p-4 text-sm text-gray-900 border border-gray-300 rounded-lg ps-10 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" :placeholder="t('search-text')" required>
        <input type="hidden" name="mode" :value="mode">
        <input type="hidden" name="ruleset" :value="ruleset">
        <input type="hidden" name="rankingSystem" :value="rankingSystem">
        <button type="submit" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          {{ t('search') }}
          <icon name="ion:search-outline" class="w-4 h-4" />
        </button>
      </div>
    </form>
    <div v-if="res" class="grid gap-8 pt-8 md:pt-16 md:gap-y-16 md:grid-cols-2">
      <div v-for="clan in res[Paginated.Data]" :key="clan.id" class="mx-4">
        <nuxt-link-locale
          class="flex flex-row items-center gap-2 md:flex-col"
          :to="{ name: 'clan-id', params: { id: clan.id } }"
        >
          <div class="relative drop-shadow-md tooltip md:mx-auto">
            <img :alt="clan.name" :src="clan.avatarSrc" class="object-cover w-24 h-24 mask mask-squircle">
            <span class="absolute bottom-0 right-0 font-semibold badge badge-lg whitespace-nowrap">
              {{ clan.badge }}
            </span>
          </div>
          <div class="flex flex-col md:items-center">
            <span class="text-xl font-bold">{{ clan.name }}</span>
            <div class="flex mt-2 -space-x-5 md:mt-4 rtl:space-x-reverse">
              <div v-for="user in clan.users" :key="clan.id + user.name" class="tooltip" :data-tip="user.name">
                <img class="object-cover w-10 h-10 rounded-full shadow " :src="user.avatarSrc" :alt="user.name">
              </div>
              <div v-if="clan.countUser - clan.users.length" class="z-10 flex items-center justify-center w-10 h-10 text-xs font-medium text-white rounded-full bg-gbase-700 hover:bg-gbase-600">
                +{{ (clan.countUser - clan.users.length).toLocaleString() }}
              </div>
            </div>
            <span v-if="selected.rankingSystem === Rank.PPv2">{{ t('avg') }}: <b>{{ pp(clan.sum[Rank.PPv2] / clan.countUser) }}</b>pp</span>
            <span v-else-if="selected.rankingSystem === Rank.PPv1">{{ t('avg') }}: <b>{{ pp(clan.sum[Rank.PPv1] / clan.countUser) }}</b>pp</span>
            <span v-else-if="selected.rankingSystem === Rank.RankedScore">{{ t(localeKey.rankingSystem(Rank.RankedScore)) }}: <b>{{ score(clan.sum[Rank.RankedScore]) }}</b></span>
            <span v-else-if="selected.rankingSystem === Rank.TotalScore">{{ t(localeKey.rankingSystem(Rank.TotalScore)) }}: <b>{{ score(clan.sum[Rank.TotalScore]) }}</b></span>
          </div>
        </nuxt-link-locale>
      </div>
    </div>
  </div>
</template>
