<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import { type DatabaseDan, Requirement } from '../def/dan'
import type { DanProvider } from '../server/backend/$base/server'
import { Mode, Ruleset } from '../def'

// eslint-disable-next-line antfu/no-const-enum
const enum State {
  Error,
  Idle,
  Loading,
}

const $requirement = $enum(Requirement)
const tMode = localeKey.root.mode
const tRule = localeKey.root.ruleset
const app = useNuxtApp()
const server = useAdapterConfig()
const { t } = useI18n()
const r = useRoute()
const query = ref({
  keyword: r.query.s?.toString() ?? '',
  page: 0,
  perPage: 10,
  mode: undefined as Mode | undefined,
  ruleset: undefined as Ruleset | undefined,
  rulesetDefaultsToStandard: false,
})

const { data, refresh } = await app.$client.dan.search.useQuery(query)

const fmtScore = createNumberFormatter()

const qualifiedScores = ref<WeakMap<DatabaseDan<string>, DanProvider.RequirementQualifiedScore<string, string>[]>>(new Map())
const loadingStates = ref<WeakMap<DatabaseDan<string>, State>>(new Map())

async function lazyLoadScore(dan: DatabaseDan<string>) {
  loadingStates.value.set(dan, State.Loading)
  try {
    const scores = await app.$client.dan.getQualifiedScores.query(dan.id)
    qualifiedScores.value.set(dan, scores)
    loadingStates.value.set(dan, State.Idle)
  }
  catch (e) {
    loadingStates.value.set(dan, State.Error)
  }
}

function getDanRequirementScores(dan: DatabaseDan<string>, requirement: Requirement) {
  return qualifiedScores.value.get(dan)?.find(r => r.requirement === requirement)?.scores
}
function getLoadingState(dan: DatabaseDan<string>) {
  return loadingStates.value.get(dan)
}
</script>

<i18n lang="yaml">
en-GB:
  search-text: Search Dans...
  search: Search
  achievement: 'achievement: '
  detail: Detail
  qf-scores: Qualified Scores (best 10)
  load-qualified-scores: load qualified scores
  mode: Mode...
  ruleset: Rule...
  unset: Unset
  treat-no-ruleset-cond-as-standard: treat dans with no ruleset requirement as standard

zh-CN:
  search-text: 搜索段位成就...
  search: 搜索
  achievement: '成就: '
  detail: 详细
  qf-scores: 满足条件的成绩 (前 10)
  load-qualified-scores: 加载满足条件的成绩
  mode: 模式
  ruleset: 玩法
  unset: 未指定
  treat-no-ruleset-cond-as-standard: 将无玩法要求的段位视为std端位

# TODO fr, DE
</i18n>

<template>
  <section class="container px-2 mx-auto space-y-8 custom-container">
    <form :action="useRequestURL().href" method="get" @submit.prevent="refresh()">
      <div class="grid grid-cols-4 pb-2 space-x-2 gap-y-2 md:grid-cols-4 lg:grid-cols-12">
        <div class="col-span-2 form-control">
          <div class="label">
            <span class="label-text">{{ t('mode') }}</span>
          </div>
          <select id="" v-model="query.mode" name="mode" class="select select-bordered" @change="() => refresh()">
            <option :value="undefined">
              {{ t('unset') }}
            </option>
            <option v-for="mode in Object.values(Mode)" :key="mode" :value="mode">
              {{ t(tMode[mode].__path__) }}
            </option>
          </select>
        </div>
        <div class="col-span-2 form-control">
          <div class="label">
            <span class="label-text">{{ t('ruleset') }}</span>
          </div>
          <select id="" v-model="query.ruleset" name="ruleset" class="select select-bordered" @change="() => refresh()">
            <option :value="undefined">
              {{ t('unset') }}
            </option>
            <option v-for="ruleset in Object.values(Ruleset)" :key="ruleset" :value="ruleset" :disabled="query.mode ? !server.hasRuleset(query.mode, ruleset) : false">
              {{ t(tRule[ruleset].__path__) }}
            </option>
          </select>
        </div>
        <div class="justify-end col-span-6 md:col-span-4 form-control">
          <label class="justify-start gap-2 cursor-pointer label">
            <span class="label-text">{{ t('treat-no-ruleset-cond-as-standard') }}</span>
            <input v-model="query.rulesetDefaultsToStandard" type="checkbox" class="toggle" @change="() => refresh()">
          </label>
        </div>
      </div>
      <label for="keyword" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">{{ t('search') }}</label>
      <div class="relative">
        <div class="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
          </svg>
        </div>
        <input id="keyword" v-model="query.keyword" name="keyword" type="search" class="block w-full p-4 text-sm text-gray-900 border border-gray-300 rounded-lg ps-10 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" :placeholder="t('search-text')">
        <button type="submit" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
          {{ t('search') }}
          <icon name="ion:search-outline" class="w-4 h-4" />
        </button>
      </div>
    </form>

    <div v-for="item in data" :key="item.id" class="relative w-full border-l-4 border-primary ps-3">
      <nuxt-link-locale class="text-3xl link" :to="{ name: 'dan-compose', query: { id: item.id } }">
        {{ item.name }}
      </nuxt-link-locale>
      <p class="whitespace-pre-wrap">
        {{ item.description }}
      </p>
      <div class="p-0 collapse collapse-plus">
        <input type="checkbox">
        <div class="text-xl font-medium collapse-title ps-0 link">
          {{ t('detail') }}
        </div>
        <div class="p-0 m-0 space-y-4 overflow-auto leading-relaxed collapse-content">
          <button class="btn" @click="lazyLoadScore(item)">
            {{ t('load-qualified-scores') }}
          </button>
          <div v-for="requirement in item.requirements" :key="requirement.id" class="border-l-4 border-secondary ps-3">
            <p class="mb-2">
              <span>{{ t('achievement') }}</span>
              <span class="font-bold">{{ $requirement.getKeyOrDefault(requirement.type, '?') }}</span>
            </p>
            <app-dan-explain-cond :cond="requirement.cond" />
            <template v-if="getLoadingState(item) === State.Idle || getLoadingState(item) === State.Loading">
              <p class="my-3">
                <span class="text-sm font-bold">{{ t('qf-scores') }}</span>
              </p>
              <div class="relative overflow-x-auto border rounded-md border-base-300">
                <table
                  class="table transition-all table-sm table-zebra"
                  :class="{
                    'opacity-30 saturate-50 blur-md': getLoadingState(item) === State.Loading,
                  }"
                >
                  <thead>
                    <tr>
                      <th scope="col">
                        User
                      </th>
                      <th scope="col">
                        Beatmap
                      </th>
                      <th scope="col">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="result in getDanRequirementScores(item, requirement.type)" :key="result.score.id">
                      <th scope="row" class="whitespace-nowrap">
                        <nuxt-link-locale
                          class="link text-sky-500"
                          :to="{
                            name: 'user-handle',
                            params: {
                              handle: result.player.id,
                            },
                          }"
                        >
                          {{ result.player.name }}
                        </nuxt-link-locale>
                      </th>
                      <td class="whitespace-nowrap">
                        <a
                          :href="`/b/${result.beatmap.id}`"
                          class="link text-sky-500"
                        >
                          {{ result.beatmap.artist }} - {{ result.beatmap.title }} [{{ result.beatmap.version }}]
                        </a>
                      </td>
                      <td class="whitespace-nowrap">
                        <nuxt-link-locale
                          class="link text-sky-500"
                          :to="{
                            name: 'score-id',
                            params: {
                              id: result.score.id,
                            },
                          }"
                        >
                          id={{ result.score.id }}
                          (acc={{ result.score.accuracy }}%, score={{ fmtScore(result.score.score) }})
                        </nuxt-link-locale>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div
                  class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur"
                  :class="{
                    'opacity-100 blur-none': getLoadingState(item) === State.Loading,
                  }"
                >
                  <div class="m-auto loading" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>

</style>
