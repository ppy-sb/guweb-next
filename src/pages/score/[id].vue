<script setup lang="ts">
import { Rank } from '~/def'

const route = useRoute('score-id')

const id = route.params.id

const app$ = useNuxtApp()
const data = await app$.$client.score.id.query({ id })

definePageMeta({
  alias: ['/scores/:id'],
})

useHead({

  title() {
    const uName = data.user.name
    const bm = beatmapIsVisible(data.beatmap)
      ? `${data.beatmap.beatmapset.meta.intl.artist} - ${data.beatmap.beatmapset.meta.intl.title}`
      : 'unknown beatmap'

    return `${uName} | ${bm}`
  },

  titleTemplate: title => `${title} - ${app$.$i18n.t(localeKey.server.name.__path__)}`,

})
</script>

<template>
  <div v-if="data" class="container !max-w-4xl mx-auto custom-container px-4">
    <app-score-heading :score="data" :ranking-system="Rank.PPv2" />
    <dev-only>
      <JsonViewer :value="data" class="mt-2 rounded-lg" />
    </dev-only>
  </div>
</template>
