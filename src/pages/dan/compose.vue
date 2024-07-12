<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import {} from '~/common/utils/dan'
import { Achievement, type AchievementBinding, type Usecase } from '~/def/dan'
import type { AppRouter } from '~/server/trpc/routers'

type RouterOutput = inferRouterOutputs<AppRouter>
const achievements = [Achievement.Pass, Achievement.NoPause]
const typeAC = [Achievement.Pass, Achievement.NoPause]
const navigator = process.server ? undefined : window.navigator
const app = useNuxtApp()
const defaultValue = {
  id: 0,
  name: '',
  description: '',
  achievements: [],
}

const compose = ref<Usecase>(defaultValue)

const data = ref<RouterOutput['score']['dan']['userRule']>()

watch(compose, () => {
  localStorage.setItem('dan-compose', JSON.stringify(compose.value))
}, { deep: true })

onMounted(() => {
  const save = localStorage.getItem('dan-compose')
  if (!save) {
    return
  }
  compose.value = JSON.parse(save)
})

async function runDB() {
  data.value = await app.$client.score.dan.userRule.query(compose.value)
}
function reset() {
  compose.value = defaultValue
}
</script>

<template>
  <section class="container max-w-screen-lg mx-auto">
    <h1 class="text-2xl">
      Compose achievements
    </h1>
    <div class="grid grid-flow-row grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-9 form-control">
        <label for="name" class="label">Name</label>
        <input id="name" v-model="compose.name" class="input" type="text" name="name">
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
        <label for="name" class="label">ID</label>
        <input id="name" v-model="compose.id" class="input" type="text" disabled name="name">
      </div>
      <div class="col-span-12 form-control">
        <label for="description" class="label">Description</label>
        <textarea id="description" v-model="compose.description" class="textarea" />
      </div>
      <div
        v-for="ach, i in compose.achievements"
        :key="i"
        class="grid grid-cols-12 col-span-12 gap-0 p-2 border border-base-300 rounded-2xl bg-base-100 "
      >
        <div class="col-span-12 md:col-span-6 form-control">
          <label for="ach-type" class="label">Achievement</label>
          <select id="ach-type" v-model="ach.achievement" class="select select-sm">
            <option value="">
              select
            </option>
            <option
              v-for="ac in typeAC"
              :key="ac"
              :value="ac"
              :selected="ac === ach.achievement"
              :disabled="!!compose.achievements.find(i => i.achievement === ac)"
            >
              {{ Achievement[ac] }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-12 col-span-12">
          <span class="label">Cond</span>
          <app-dan-cond
            v-model="ach.cond"
            :list-mode="true"
            @delete="(compose.achievements as any[]).splice(i, 1)"
          />
        </div>
      </div>
      <button
        class="col-span-12 btn"
        :disabled="achievements.every(ach => !!compose.achievements.find(i => i.achievement === ach)) || compose.achievements.length >= achievements.length"
        @click="
          (compose.achievements as unknown as AchievementBinding<any, any>[])
            .push({
              achievement: undefined,
              cond: undefined,
            })
        "
      >
        add achievement
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="reset"
      >
        reset
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="navigator?.clipboard.writeText(JSON.stringify(compose))"
      >
        copy to clipboard
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-warning" @click="runDB"
      >
        run in db
      </button>
    </div>
    <div v-if="data" class="py-4 space-y-4">
      <table
        v-for="ach, i in data" :key="i"
        class="table table-zebra caption-top"
      >
        <caption class="py-2 bg-base-200">
          {{ Achievement[ach.achievement] }}
        </caption>
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
          <tr v-for="result in ach.results" :key="result.score.id">
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
  </section>
</template>

<style scoped>

</style>
