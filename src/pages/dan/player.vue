<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Mode, Ruleset } from '~/def'
import { useNuxtApp } from '#app'

// Constants and Localization
const tRequirement = localeKey.root.dan.requirement
const { t, locale } = useI18n()

const tMode = localeKey.root.mode
const tRule = localeKey.root.ruleset

const app = useNuxtApp()
const server = useAdapterConfig()
const route = useRoute()

const kw = ref(route.query.id?.toString() ?? '')
const qUser = await app.$client.search.searchUser.useQuery(() => ({ keyword: kw.value }), { lazy: true, default: () => ref([]) as any })
const query = ref({
  // page: 0,
  // perPage: 10,
  mode: undefined as Mode | undefined,
  ruleset: undefined as Ruleset | undefined,
  mania: {
    keyCount: undefined as number | undefined,
  },
})

const userId = ref(route.query.id?.toString() ?? '')
// const pagination = ref({
//   page: 0,
//   perPage: 10,
// })
const { data, refresh, status } = await useAsyncData(
  async () => {
    if (!userId.value) {
      return {
        count: 0,
        data: [],
      }
    }
    const v = await app.$client.dan.userClearedScores.list.query({ id: userId.value, ...query.value })
    const c = await app.$client.dan.userClearedScores.count.query({ id: userId.value, ...query.value })
    return {
      total: c,
      data: v,
    }
  },
)

watch(qUser.data, (val) => {
  if (val?.length === 1) {
    userId.value = val[0].id
  }
  else {
    userId.value = ''
  }
})
watch(userId, () => {
  refresh()
})

const selectedUser = computed(() => qUser.data.value?.find(u => u.id === userId.value))

// Helper function to format dates
function formatDate(dateString: Date) {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
  return dateString.toLocaleDateString(locale.value, options)
}
</script>

<i18n lang="yaml">
en-GB:
  qf-scores: Qualified Scores (best 10)
  load-qualified-scores: load qualified scores
  mode: Mode...
  ruleset: Rule...
  unset: Unset
  key: Key

zh-CN:
  qf-scores: 满足条件的成绩 (前 10)
  load-qualified-scores: 加载满足条件的成绩
  mode: 模式
  ruleset: 玩法
  unset: 未指定
  treat-no-ruleset-cond-as-standard: 将无玩法要求的段位视为std端位
  key: 键数
</i18n>

<template>
  <div class="container max-w-screen-lg p-4 mx-auto custom-container">
    <div role="alert" class="alert mb-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="h-6 w-6 shrink-0 stroke-current"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>WIP preview.</span>
    </div>
    <!-- User Input Form -->
    <form action="#" class="flex flex-col items-center gap-4 mb-4 sm:flex-row" @submit.prevent="() => refresh()">
      <div class="grid grid-cols-4 pb-2 space-x-2 gap-y-2 lg:grid-cols-12 items-end">
        <div class="form-control col-span-2">
          <input
            v-model="kw"
            type="text"
            placeholder="Search user ID or name"
            class="w-full input input-bordered"
            required
          >
        </div>
        <div class="form-control col-span-2">
          <select id="user" v-model="userId" class="select" name="user">
            <option value="" disabled>
              Select User
            </option>
            <option v-for="user in qUser.data.value" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
        <div class="col-span-12" />
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
        <div v-show="query.mode === Mode.Mania" class="col-span-2 form-control">
          <div class="label">
            <span class="label-text">{{ t('key') }}</span>
          </div>
          <select id="" v-model="query.mania.keyCount" name="ruleset" class="select select-bordered" @change="() => refresh()">
            <option :value="undefined">
              {{ t('unset') }}
            </option>
            <option v-for="(_, keyCount) in 9" :key="keyCount" :value="keyCount + 2">
              {{ keyCount + 2 }}K
            </option>
          </select>
        </div>
      </div>
      <button type="submit" class="w-full btn btn-primary sm:w-auto">
        Refresh
      </button>
    </form>

    <div v-if="selectedUser" class="flex items-center space-x-3 mb-2">
      <div class="avatar">
        <div class="w-12 h-12 mask mask-squircle">
          <img :src="selectedUser.avatarSrc" alt="avatar">
        </div>
      </div>
      <div>
        <nuxt-link-locale
          class="font-bold whitespace-nowrap"
          :to="{ name: 'user-handle', params: { handle: `@${selectedUser.safeName}` } }"
        >
          {{ selectedUser.name }}
        </nuxt-link-locale>
        <div v-if="data" class="text-gray-500 text-sm whitespace-nowrap">
          <span class="font-bold">{{ data.total }}</span> dans achieved.
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="status === 'pending'" class="flex justify-center">
      <div class="loader" />
    </div>

    <!-- Error State -->
    <div v-if="status === 'error'" class="mb-4 shadow-lg alert alert-error">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Error fetching data. Please try again.</span>
      </div>
    </div>

    <!-- No Data State -->
    <div v-if="!userId" class="text-center text-gray-500">
      Please select a user.
    </div>

    <!-- Data Display -->
    <div v-else-if="data?.data.length" class="space-y-4">
      <div
        v-for="item in data.data"
        :key="item.score.id.toString()"
        class="flex flex-col p-4 transition-shadow duration-200 bg-white rounded-lg shadow-sm dark:bg-base-200 sm:flex-row hover:shadow"
      >
        <!-- Score and Beatmap Details -->
        <div class="flex-1">
          <!-- Dan Name and Requirements -->
          <div>
            <nuxt-link-locale :to="{ name: 'dan-detail-id', params: { id: item.dan.id } }">
              <h2 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200 link">
                {{ item.dan.name }}
              </h2>
            </nuxt-link-locale>
            <p class="text-sm text-gray-500">
              Qualified:
            </p>
            <ul class="mb-2 text-gray-700 list-inside list-decimal dark:text-gray-300">
              <li v-for="req in item.requirements" :key="item.score.id.toString() + req">
                {{ t(tRequirement[req].__path__) }}
              </li>
            </ul>
          </div>

          <!-- <div class="relative border rounded-lg dark:border-base-300 overflow-clip">
            <img
              :src="item.score.beatmap.beatmapset.assets.cover"
              :alt="autoLocale(item.score.beatmap.beatmapset.meta).title"
              class="absolute object-cover w-full h-full mr-4 rounded opacity-10"
              loading="lazy"
              :onerror="placeholder"
            >

          </div> -->
          <div class="flex flex-col gap-4 backdrop-blur-xl md:flex-row ">
            <!-- Beatmap Cover Image -->
            <img
              :src="item.score.beatmap.beatmapset.assets.list"
              :srcset="`${item.score.beatmap.beatmapset.assets.list} 1x, ${item.score.beatmap.beatmapset.assets['list@2x']} 2x`"
              :alt="autoLocale(item.score.beatmap.beatmapset.meta).title"
              class="hidden object-cover h-32 aspect-square border rounded dark:border-base-300 md:block"
              loading="lazy"
              :onerror="placeholder"
            >
            <!-- :srcset="`${item.score.beatmap.beatmapset.assets.cover} 1x, ${item.score.beatmap.beatmapset.assets['cover@2x']} 2x`" -->
            <img
              :src="item.score.beatmap.beatmapset.assets.cover"
              :alt="autoLocale(item.score.beatmap.beatmapset.meta).title"
              class="object-cover h-40 border rounded dark:border-base-300 md:hidden"
              loading="lazy"
              :onerror="placeholder"
            >
            <div class="grow">
              <!-- Beatmap Information -->
              <div class="flex items-center">
                <nuxt-link-locale
                  :to="{
                    name: 'beatmapset-id',
                    params: { id: item.score.beatmap.beatmapset.id },
                    query: {
                      mode: item.score.mode,
                      ruleset: item.score.ruleset,
                    },
                  }"
                  class="font-medium text-gray-800 dark:text-gray-200 link"
                >
                  {{ autoLocale(item.score.beatmap.beatmapset.meta).artist }} -
                  {{ autoLocale(item.score.beatmap.beatmapset.meta).title }}
                </nuxt-link-locale>
              </div>
              <!-- Score Details -->
              <div class="mt-4">
                <div class="grid grid-flow-col grid-rows-6 md:grid-rows-3 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <span class="font-semibold">ID:</span> <nuxt-link-locale class="link" :to="{ name: 'score-id', params: { id: item.score.id } }">
                      {{ item.score.id }}
                    </nuxt-link-locale>
                  </div>
                  <div><span class="font-semibold">Mode:</span> {{ item.score.mode }}</div>
                  <div><span class="font-semibold">Ruleset:</span> {{ item.score.ruleset }}</div>
                  <div><span class="font-semibold">Score:</span> {{ item.score.score }}</div>
                  <div><span class="font-semibold">Accuracy:</span> {{ item.score.accuracy }}%</div>
                  <!-- <div><span class="font-semibold">PP:</span> {{ item.score.pp }}</div> -->
                  <div><span class="font-semibold">Max Combo:</span> {{ item.score.maxCombo }}</div>
                  <div><span class="font-semibold">Grade:</span> {{ item.score.grade }}</div>
                  <div><span class="font-semibold">Mods:</span> <app-mod v-for="m in item.score.mods" :key="m" :mod="m" /></div>
                  <div><span class="font-semibold">Played At:</span> {{ formatDate(item.score.playedAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="text-center text-gray-500">
      No cleared dans found for this user.
    </div>
  </div>
</template>

<style scoped>
/* Custom loader style */
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #5651e5;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
