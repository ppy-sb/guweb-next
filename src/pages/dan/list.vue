<script setup lang="ts">
import { Mode, Ruleset } from '~/def'
import { useSession } from '~/store/session'

const tMode = localeKey.root.mode
const tRule = localeKey.root.ruleset

const app = useNuxtApp()
const server = useAdapterConfig()
const { t } = useI18n()
const r = useRoute()
const session = useSession()
const query = ref({
  keyword: r.query.s?.toString() ?? '',
  page: 0,
  perPage: 10,
  mode: undefined as Mode | undefined,
  ruleset: undefined as Ruleset | undefined,
  rulesetDefaultsToStandard: false,
})

const { data, refresh, status } = await app.$client.dan.search.useQuery(query)

async function update() {
  // check ruleset
  if (query.value.mode && query.value.ruleset && !server.hasRuleset(query.value.mode, query.value.ruleset)) {
    query.value.ruleset = undefined
  }

  await refresh()
}
</script>

<i18n lang="yaml">
en-GB:
  search-text: Search Dans...
  search: Search
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
  <section class="container px-2 mx-auto custom-container">
    <form :action="useRequestURL().href" method="get" @submit.prevent="update()">
      <div class="grid grid-cols-4 pb-2 space-x-2 gap-y-2 md:grid-cols-4 lg:grid-cols-12">
        <div class="col-span-2 form-control">
          <div class="label">
            <span class="label-text">{{ t('mode') }}</span>
          </div>
          <select id="" v-model="query.mode" name="mode" class="select select-bordered" @change="() => update()">
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
          <select id="" v-model="query.ruleset" name="ruleset" class="select select-bordered" @change="() => update()">
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
            <input v-model="query.rulesetDefaultsToStandard" type="checkbox" class="toggle" @change="() => update()">
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

    <div v-if="data" class="relative pt-4 space-y-4">
      <span class="text-gbase-500 text-sm">found {{ data.total }} results.</span>
      <div
        v-for="item in data.data" :key="item.id" class="relative w-full transition-all rounded-lg bg-base-100 ps-3"
        :class="{
          'blur opacity-30': status === 'pending',
        }"
      >
        <div class="p-0 collapse collapse-plus">
          <input type="checkbox">
          <div class="text-xl font-medium collapse-title ps-0">
            {{ item.name }}
          </div>

          <div class="p-0 m-0 space-y-4 overflow-auto leading-relaxed collapse-content">
            <p class="whitespace-pre-wrap text-sm">
              {{ item.description }}
            </p>
            <dan-explain-requirement v-for="requirement in item.requirements" :key="requirement.type" :requirement="requirement" />
            <div class="space-x-2">
              <nuxt-link-locale
                :to="{
                  name: 'dan-detail-id',
                  params: {
                    id: item.id,
                  },
                }"
                class="btn btn-primary btn-sm"
              >
                {{ t('detail') }}
              </nuxt-link-locale>
              <nuxt-link-locale v-if="session.role.staff" class="btn btn-sm" :to="{ name: 'dan-compose', query: { id: item.id } }">
                Edit
              </nuxt-link-locale>
            </div>
          </div>
        </div>
      </div>
      <div
        class="absolute transition-opacity -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none left-1/2 top-1/2"
        :class="{
          'opacity-100': status === 'pending',
        }"
      >
        <div class="loading" />
      </div>
    </div>
  </section>
</template>

<style scoped>

</style>
