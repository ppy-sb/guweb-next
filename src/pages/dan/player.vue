<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNuxtApp } from '#app'

// Constants and Localization
const tRequirement = localeKey.root.dan.requirement
const { t, locale } = useI18n()

const app = useNuxtApp()

const kw = ref('')
const qUser = await app.$client.search.searchUser.useQuery(() => ({ keyword: kw.value }), { lazy: true })

const userId = ref('')
const { data, refresh, status } = await app.$client.dan.userClearedScores.useQuery(
  () => ({ id: userId.value }),
  { immediate: false, default: () => ref([]) as any }
)

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

<template>
  <div class="container max-w-screen-lg p-4 mx-auto custom-container">
    <!-- User Input Form -->
    <form action="#" class="flex flex-col items-center gap-4 mb-8 sm:flex-row" @submit.prevent="() => refresh()">
      <div class="w-full form-control sm:w-auto">
        <input
          v-model="kw"
          type="text"
          placeholder="Enter user ID or name"
          class="w-full input input-bordered"
          required
        >
      </div>
      <div class="w-full form-control sm:w-auto">
        <select id="user" v-model="userId" class="select" name="user">
          <option v-for="user in qUser.data.value" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>
      <button type="submit" class="w-full btn btn-primary sm:w-auto">
        Refresh
      </button>
    </form>

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

    <!-- Data Display -->
    <div v-if="data && data.length" class="space-y-6">
      <div
        v-for="item in data"
        :key="item.score.id.toString()"
        class="flex flex-col p-4 transition-shadow duration-200 bg-white rounded-lg shadow-sm dark:bg-base-200 sm:flex-row hover:shadow"
      >
        <!-- Score and Beatmap Details -->
        <div class="flex-1">
          <!-- Dan Name and Requirements -->
          <div>
            <nuxt-link-locale :to="{ name: 'dan-id-detail', params: { id: item.dan.id } }">
              <h2 class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200 link">
                {{ item.dan.name }}
              </h2>
            </nuxt-link-locale>
            <p class="text-sm text-gray-500">
              Qualified:
            </p>
            <ul class="mb-2 text-gray-700 list-disc list-inside dark:text-gray-300">
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
          <div class="flex flex-col gap-4 p-4 backdrop-blur-xl md:flex-row ">
            <!-- Beatmap Cover Image -->
            <img
              :src="item.score.beatmap.beatmapset.assets.list"
              :alt="autoLocale(item.score.beatmap.beatmapset.meta).title"
              class="h-40 border rounded dark:border-base-300"
              loading="lazy"
              :onerror="placeholder"
            >
            <div>
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
                <div class="grid grid-flow-col grid-rows-5 gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <span class="font-semibold">ID:</span> <nuxt-link-locale class="link" :to="{ name: 'score-id', params: { id: item.score.id } }">
                      {{ item.score.id }}
                    </nuxt-link-locale>
                  </div>
                  <div><span class="font-semibold">Mode:</span> {{ item.score.mode }}</div>
                  <div><span class="font-semibold">Ruleset:</span> {{ item.score.ruleset }}</div>
                  <div><span class="font-semibold">Accuracy:</span> {{ item.score.accuracy }}%</div>
                  <div><span class="font-semibold">Score:</span> {{ item.score.score }}</div>
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
    <div v-if="data && !data.length" class="text-center text-gray-500">
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
