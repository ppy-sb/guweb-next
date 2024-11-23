<script setup lang="ts" async>
import { LogLevel } from '~/def'

enum Direction {
  asc = 'asc',
  desc = 'desc',
}

definePageMeta({
  middleware: 'admin',
})

const app = useNuxtApp()
const { t, locale } = useI18n()

const direction = ref<Direction>(Direction.desc)
const q = reactive({
  last: 50,
  loglevel: LogLevel.warn,
})
const { data: logs, refresh } = await app.$client.admin.log.last.useQuery(q)
watch(q, () => refresh())

useHead({
  title: () => t(localeKey.title.logs.__path__),
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
})

async function truncate() {
  logs.value = await app.$client.admin.log.truncate.mutate()
}
</script>

<template>
  <div>
    <div class="mb-5 px-4 flex justify-between">
      <h1 class="text-xl italic font-bold inline-block">
        {{ t('title.logs') }}
      </h1>
      <button class="btn btn-primary" @click="truncate">
        truncate
      </button>
    </div>
    <div class="grid grid-cols-12 py-4 gap-4">
      <div class="col-span-12 md:col-span-6 lg:col-span-4">
        <label for="loglevel" class="label">Log Level: {{ LogLevel[q.loglevel] }}</label>
        <input id="loglevel" v-model.number="q.loglevel" type="range" min="0" max="6" class="range range-sm" step="1">
        <div class="flex w-full justify-between px-2 text-xs">
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
          <span>|</span>
        </div>
      </div>
      <div class="col-span-6 md:col-span-4 lg:col-span-2 form-control">
        <label for="last" class="label">Last</label>
        <input id="last" v-model.number="q.last" class="input input-sm">
      </div>
      <div class="col-span-6 md:col-span-4 lg:col-span-2 form-control">
        <label for="direction" class="label">Direction</label>
        <select id="direction" v-model="direction" class="select select-sm">
          <option v-for="d in Object.values(Direction)" :key="d" :value="d">
            {{ d }}
          </option>
        </select>
      </div>
    </div>
    <div class="py-4">
      <button class="btn" @click="() => refresh()">
        fetch
      </button>
    </div>
    <div class="overflow-x-auto rounded border border-base-300">
      <table class="table table-sm table-zebra table-pin-rows">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Label</th>
            <th>Backend</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in direction === Direction.asc ? logs : logs?.toReversed()" :key="`log-${log.timestamp}`">
            <td class="whitespace-pre">
              {{ new Date(log.timestamp).toLocaleString(locale) }}
            </td>
            <td class="whitespace-pre">
              {{ log.level }}
            </td>
            <td class="whitespace-pre">
              {{ log.label }}
            </td>
            <td class="whitespace-pre">
              {{ log.backend }}
            </td>
            <td class="whitespace-pre">
              {{ log.message }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>
