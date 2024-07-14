<script setup lang="ts">
import { Requirement } from '../../def/dan'

const app = useNuxtApp()
const { t } = useI18n()
const r = useRoute()
const query = ref({
  keyword: r.query.s?.toString() ?? '',
  page: 0,
  perPage: 10,
})
const { data, refresh } = await app.$client.dan.search.useQuery(query)
</script>

<i18n lang="yaml">
en-GB:
  search-text: Search Dans...
  search: Search

zh-CN:
  search-text: 搜索段位成就...
  search: 搜索

# TODO fr, DE
</i18n>

<template>
  <section class="container mx-auto custom-container space-y-8">
    <form :action="useRequestURL().href" method="get" @submit.prevent="refresh()">
      <label for="keyword" class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
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

    <div v-for="item in data" :key="item.id" class="border-l-4 border-primary ps-3">
      <nuxt-link-locale class="text-3xl link" :to="{ name: 'dan-compose', query: { id: item.id } }">
        {{ item.name }}
      </nuxt-link-locale>
      <p class="text-lg">
        {{ item.description }}
      </p>
      <div class="collapse collapse-plus p-0">
        <input type="checkbox">
        <div class="collapse-title ps-0 text-xl font-medium">
          Detail
        </div>
        <div class="collapse-content p-0 m-0 space-y-4">
          <div v-for="requirement in item.requirements" :key="requirement.id" class="border-l-4 border-secondary ps-3">
            <p class="mb-2">
              <span>Achievement: </span>
              <span class="font-bold">{{ Requirement[requirement.type] }}</span>
            </p>
            <app-dan-explain-cond :cond="requirement.cond" />
            <p class="mb-2">
              Qualified Scores (best 10):
            </p>
            <table class="table table-sm table-zebra">
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
                <tr v-for="result in requirement.scores" :key="result.score.id">
                  <th scope="row">
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
                  <td>
                    <a
                      :href="`/b/${result.beatmap.id}`"
                      class="link text-sky-500"
                    >
                      {{ result.beatmap.artist }} - {{ result.beatmap.title }} [{{ result.beatmap.version }}]
                    </a>
                  </td>
                  <td>
                    <nuxt-link-locale
                      class="link text-sky-500"
                      :to="{
                        name: 'score-id',
                        params: {
                          id: result.score.id,
                        },
                      }"
                    >
                      {{ result.score.id }}
                    </nuxt-link-locale>
                    ({{ result.score.accuracy }}%, {{ result.score.score }})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>

</style>
