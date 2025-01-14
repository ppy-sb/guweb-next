<script setup lang="ts">
import type { DatabaseDan } from '~/def/dan'

definePageMeta({
  middleware: ['auth', 'staff'],

})
const ignoreId = ref(false)
const file = useTemplateRef('import-file')
const dans = ref<DatabaseDan<string>[]>([])
const app = useNuxtApp()

async function importAll() {
  for (const dan of dans.value) {
    if (ignoreId.value) {
      dan.id = undefined as unknown as string
    }

    await app.$client.dan.save.mutate(dan)
  }
}

function parse() {
  const _file = file.value?.files?.[0]
  if (!_file) {
    return
  }
  const reader = new FileReader()
  reader.readAsText(_file, 'utf-8')
  reader.addEventListener('load', (e) => {
    dans.value = JSON.parse(reader.result!.toString())
  })
}
</script>

<template>
  <div class="container mx-auto custom-container">
    <h2 class="text-lg divider">
      Export
    </h2>
    <a class="btn" href="/api/admin/dan/export">
      Export all
    </a>

    <h2 class="text-lg divider">
      Import
    </h2>
    <form action="#" @submit.prevent="importAll">
      <div class="grid items-center grid-cols-6 gap-4 md:grid-cols-12">
        <div class="col-span-4 form-control">
          <label class="label">
            Ignore ID
            <input v-model="ignoreId" type="checkbox" class="toggle">
          </label>
        </div>
        <div class="col-span-4 form-control">
          <input ref="import-file" type="file" class="file-input" @change="parse">
        </div>
        <button class="col-span-2 btn">
          Import All
        </button>
      </div>
    </form>

    <json-viewer class="mt-4" :value="dans" />
  </div>
</template>
