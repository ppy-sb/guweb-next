<script setup lang="ts" async>
definePageMeta({
  middleware: 'admin',
})

const app = useNuxtApp()
const last = ref(50)
const { data: logs } = await app.$client.admin.log.last.useQuery(last)
const { t, locale } = useI18n()

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
          <tr v-for="log in logs" :key="`log-${log.timestamp}`">
            <td class="whitespace-pre">
              {{ log.timestamp.toLocaleString(locale) }}
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
