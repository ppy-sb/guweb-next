<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import {} from '~/common/utils/dan'
import { Achievement, type AchievementBinding, type Usecase } from '~/def/dan'
import type { AppRouter } from '~/server/trpc/routers'

type RouterOutput = inferRouterOutputs<AppRouter>

const app = useNuxtApp()

const compose = ref<Usecase>({
  id: 0,
  name: '',
  description: '',
  achievements: [],
})

const typeAC = [Achievement.Pass, Achievement.NoPause]

const navigator = process.server ? undefined : window.navigator

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
</script>

<template>
  <section class="container max-w-screen-lg mx-auto">
    <h1 class="text-2xl">
      Compose achievements
    </h1>
    <div class="grid grid-cols-4 gap-4">
      <div class="form-control col-span-3">
        <label for="name" class="label">Name</label>
        <input id="name" v-model="compose.name" class="input" type="text" name="name">
      </div>
      <div class="form-control">
        <label for="name" class="label">ID</label>
        <input id="name" v-model="compose.id" class="input" type="text" disabled name="name">
      </div>
      <div class="form-control col-span-4">
        <label for="description" class="label">Description</label>
        <textarea id="description" v-model="compose.description" class="textarea" />
      </div>
      <div
        v-for="ach, i in compose.achievements"
        :key="i"
        class="p-4 border rounded-2xl bg-neutral col-span-4 grid grid-cols-4"
      >
        <div class="form-control col-span-4">
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
        <div class="form-control col-span-4">
          <label class="label">Cond</label>
          <app-dan-cond
            v-model="ach.cond"
          />
        </div>
      </div>
      <button
        class="btn" @click="(compose.achievements as unknown as AchievementBinding<any, any>[])
          .push({
            achievement: undefined,
            cond: undefined,
          })"
      >
        add
      </button>
      <button
        class="btn" @click="navigator?.clipboard.writeText(JSON.stringify(compose));"
      >
        copy to clipboard
      </button>
      <button
        class="btn btn-warning" @click="runDB"
      >
        run through db
      </button>
    </div>
    <div v-if="data">
      <table
        v-for="ach, i in data" :key="i"
        class="table table-zebra"
      >
        <caption>
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
          <tr v-for="score in ach.results" :key="score.score.id">
            <th scope="row">
              <nuxt-link-locale
                class="link text-sky-500"
                :to="{
                  name: 'user-handle',
                  params: {
                    handle: score.player.id,
                  },
                }"
              >
                {{ score.player.name }}
              </nuxt-link-locale>
            </th>
            <td>
              <a
                :href="`/b/${score.beatmap.id}`"
                class="link text-sky-500"
              >
                {{ score.beatmap.artist }} - {{ score.beatmap.title }}
              </a>
            </td>
            <td>
              <nuxt-link-locale
                class="link text-sky-500"
                :to="{
                  name: 'score-id',
                  params: {
                    id: score.score.id,
                  },
                }"
              >
                {{ score.score.id }}
              </nuxt-link-locale>
              ({{ score.score.accuracy }}%, {{ score.score.score }})
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>

</style>
