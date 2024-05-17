<script setup lang="ts" async>
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem } from '~/def/common'
import type { SwitcherPropType } from '~/composables/useSwitcher'

const config = useRuntimeConfig()

const route = useRoute('leaderboard-mode')
const router = useRouter()
const app = useNuxtApp()
const { supportedModes, supportedRulesets } = useAdapterConfig()
const { t } = useI18n()

const { mode: pMode } = route.params
const { ruleset: pRuleset, ranking: pRankingSystem, page: pPage } = route.query

const availableRankingSystems = Object.keys(config.public.leaderboardRankingSystem)
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

const page = shallowRef((isString(pPage) && Number.parseInt(pPage)) || 1)

const perPage = 20

const selected = ref<Required<SwitcherPropType<LeaderboardRankingSystem>>>({
  mode,
  ruleset,
  rankingSystem,
})
const { data: total } = await app.$client.rank.countLeaderboard.useQuery(selected)

const totalPages = computed(() => Math.min(Math.ceil((total.value || 0) / perPage), 5))
watch(totalPages, boundaryPage, { immediate: true })

const queryLeaderboardValue = computed(() => ({
  mode: selected.value.mode,
  ruleset: selected.value.ruleset,
  rankingSystem: selected.value.rankingSystem,
  page: Math.max(page.value - 1, 0),
  pageSize: perPage,
}))

const { pending, data: table } = await app.$client.rank.leaderboard.useQuery(queryLeaderboardValue)

useHead({
  titleTemplate(title) {
    return `${title} - ${app.$i18n.t(localeKey.server.name.__path__)}`
  },
  title: () => `${t(localeKey.mode(selected.value.mode))} | ${t(localeKey.ruleset(selected.value.ruleset))} | ${t(localeKey.rankingSystem(selected.value.rankingSystem))} - ${t(localeKey.title.leaderboard.__path__)}`,
})

function boundaryPage() {
  const outOfRange = page.value > totalPages.value
  if (outOfRange) {
    page.value = totalPages.value
  }
}

function rewriteHistory() {
  const l = window.location
  const r = router.resolve({
    name: 'leaderboard-mode',
    params: {
      mode: selected.value.mode,
    },
    query: {
      ranking: selected.value.rankingSystem,
      ruleset: selected.value.ruleset,
      page: page.value,
    },
  })

  const rewrite = l.origin + r.fullPath
  history.replaceState({}, '', rewrite)
}

function reloadPage(i?: number) {
  if (i) {
    page.value = i
  }
  rewriteHistory()
}
</script>

<i18n lang="yaml">
en-GB:
  no-score: No one played this mode yet.
  no-score-alt: Wanna be the first one? Go for it.
  total: '{total} rows'

zh-CN:
  no-score: 该模式目前还没有人玩过。
  no-score-alt: 想要成为第一名吗? 冲吧!

fr-FR:
  no-score: Personne n'a joué ce mode encore.
  no-score-alt: Vous voulez être le premier? Allez-y.

de-DE:
  no-score: Noch niemand hat diesen Modus gespielt.
  no-score-alt: Möchtest du der Erste sein? Los geht's.
  total: '{total} Zeilen'
</i18n>

<template>
  <div class="flex flex-col h-full leaderboard custom-container mx-auto !max-w-4xl w-full">
    <header-simple-title-with-sub
      id="desc"
      :title="$t('title.leaderboard')"
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
        @update:model-value="reloadPage()"
      />
      <template #after-title>
        <i18n-t keypath="total" tag="p" class="text-xs opacity-40">
          <template #total>
            <span class="font-mono">{{ total }}</span>
          </template>
        </i18n-t>
      </template>
    </header-simple-title-with-sub>
    <div
      v-if="table"
      class="flex flex-col w-full"
      :class="{
        content: table.length,
      }"
    >
      <div v-if="table.length" class="relative w-full mx-auto overflow-x-auto xl:rounded-lg">
        <table class="table table-zebra whitespace-nowrap" aria-describedby="desc">
          <thead class="text-base">
            <tr>
              <th class="text-center">
                Rank
              </th>
              <th class="text-center">
                Flag
              </th>
              <th class="text-center">
                Player
              </th>
              <th class="px-4 font-semibold text-end">
                {{
                  $t(localeKey.rankingSystem(selected.rankingSystem))
                }}
              </th>
              <th class="px-4 font-medium text-end">
                {{ $t('global.accuracy') }}
              </th>
              <th class="px-4 font-medium text-end">
                {{ $t('global.play-count') }}
              </th>
            </tr>
          </thead>
          <tbody
            class="transition-opacity origin-center transition-filter"
            :class="{
              'opacity-30 saturate-50 blur-md': pending,
            }"
          >
            <leaderboard-user-table
              v-for="(item, index) in table"
              :key="index"
              :user="item.user"
              :in-this-leaderboard="item.inThisLeaderboard"
              :sort="selected.rankingSystem"
            />
          </tbody>
        </table>
        <div
          class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm" :class="{
            'opacity-100 !blur-none': pending,
          }"
        >
          <div class="m-auto loading loading-lg" />
        </div>
      </div>
      <div
        v-else-if="!pending"
        class="pb-10 my-auto text-gbase-900 dark:text-gbase-100 grow"
      >
        <h1 class="text-xl font-semibold text-center">
          {{ t('no-score') }}
        </h1>
        <h2 class="text-sm font-semibold text-center opacity-60">
          {{ t('no-score-alt') }}
        </h2>
      </div>
      <div v-if="totalPages > 1" class="mx-auto mt-4 join outline outline-2">
        <input v-for="i in totalPages" :key="`pagination-${i}`" class="join-item btn btn-ghost checked:outline outline-2" type="radio" :checked="page === i" name="options" :aria-label="i.toString()" @click="reloadPage(i)">
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.bigger-when-active:active {
  @apply font-semibold drop-shadow-md border-2 rounded-lg
}
</style>
