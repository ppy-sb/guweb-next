<script setup lang="ts">
import type { inferRouterOutputs } from '@trpc/server'
import { validateUsecase } from '~/common/utils/dan'
import { type DatabaseDan, Requirement, type RequirementCondBinding } from '~/def/dan'
import type { AppRouter } from '~/server/trpc/routers'
import { useSession } from '~/store/session'

const tRequirement = localeKey.root.dan.requirement

type RouterOutput = inferRouterOutputs<AppRouter>
const requirements = [Requirement.Pass, Requirement.NoPause]
const typeAC = [Requirement.Pass, Requirement.NoPause]
const app = useNuxtApp()
const route = useRoute()
const session = useSession()
const { t } = useI18n()

const qId = route.query.id?.toString()

const defaultValue: DatabaseDan<string> & { _db: boolean } = {
  id: '',
  name: '',
  description: '',
  requirements: [],
  _db: false,
}

const compose = ref<typeof defaultValue>(qId ? await _getDB(qId) : structuredClone(defaultValue))

const data = ref<RouterOutput['dan']['userRule']>()
const loading = ref(false)

watch(compose, () => {
  localStorage.setItem('dan-compose', JSON.stringify(compose.value))
}, { deep: true })

const fmtScore = createNumberFormatter()

function loadLast() {
  const save = localStorage.getItem('dan-compose')
  if (!save) {
    return
  }
  compose.value = JSON.parse(save)
}

function copy() {
  navigator?.clipboard.writeText(JSON.stringify(compose.value))
}

async function readClipboard() {
  const text = await navigator.clipboard.readText()
  if (!text) {
    return
  }
  compose.value = unDB(JSON.parse(text))
}

async function getDB() {
  loading.value = true
  try {
    compose.value = await _getDB(compose.value.id)
  }
  finally {
    loading.value = false
  }
}

async function _getDB(id: string) {
  return {
    ...await app.$client.dan.get.query(id),
    _db: true,
  }
}

async function runDB() {
  loading.value = true
  try {
    data.value = await app.$client.dan.userRule.query(validateUsecase(compose.value))
  }
  finally {
    loading.value = false
  }
}
function reset() {
  compose.value = defaultValue
}

async function saveDB() {
  compose.value = {
    ...await app.$client.dan.save.mutate(compose.value, {
      context: {
        skipBatch: true,
      },
    }),
    _db: true,
  }
}
async function deleteDB() {
  await app.$client.dan.delete.mutate(compose.value.id)
  reset()
}
async function duplicate() {
  compose.value = unDB(compose.value)
}

function unDB<T extends DatabaseDan<string>>(val: T): T {
  val = validateUsecase(val)
  ;(val as any)._db = false
  val.id = ''
  val.requirements.forEach((r) => {
    r.id = ''
  })
  return val
}

function confirm(msg: string) {
  return window.confirm(msg)
}
</script>

<i18n lang="yaml">
en-GB:
  delete-confirm: Are you sure? This action cannot be undone.

zh-CN:
  delete-confirm: 确定删除? 本操作无法撤销。
</i18n>

<template>
  <section class="container max-w-screen-lg mx-auto">
    <h1 class="text-2xl">
      Compose requirements
    </h1>
    <div class="grid grid-flow-row grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-9 form-control">
        <label for="name" class="label">Name</label>
        <input id="name" v-model="compose.name" class="input" type="text" name="name">
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
        <label for="name" class="label">ID</label>
        <input id="name" v-model="compose.id" disabled class="input" type="text" name="name" @change="getDB">
      </div>
      <div class="col-span-12 form-control">
        <label for="description" class="label">Description</label>
        <textarea id="description" v-model="compose.description" class="textarea" />
      </div>
      <div
        v-for="ach, i in compose.requirements"
        :key="i"
        class="grid grid-cols-12 col-span-12 gap-0 p-2 border border-base-300 rounded-2xl bg-base-100 "
      >
        <div class="col-span-12 md:col-span-6 form-control">
          <label for="ach-type" class="label">requirement</label>
          <select id="ach-type" v-model="ach.type" class="select select-sm">
            <option value="">
              select
            </option>
            <option
              v-for="ac in typeAC"
              :key="ac"
              :value="ac"
              :selected="ac === ach.type"
              :disabled="!!compose.requirements.find(i => i.type === ac)"
            >
              {{ t(tRequirement[ac].__path__) }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-12 col-span-12">
          <span class="label">Cond</span>
          <app-dan-cond
            v-model="ach.cond"
            :list-mode="true"
            :requirements="compose.requirements"
            :current="ach"
            @delete="(compose.requirements as any[]).splice(i, 1)"
          />
        </div>
      </div>
      <button
        class="col-span-12 btn"
        :disabled="requirements.every(ach => !!compose.requirements.find(i => i.type === ach)) || compose.requirements.length >= requirements.length"
        @click="
          (compose.requirements as unknown as RequirementCondBinding<any, any>[])
            .push({
              type: undefined,
              cond: undefined,
            })
        "
      >
        add requirement
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="reset"
      >
        reset
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="loadLast"
      >
        recover last closed
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="copy"
      >
        copy to clipboard
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn" @click="readClipboard"
      >
        read from clipboard
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-info" :disabled="!compose._db" @click="duplicate"
      >
        copy as new
        <i v-if="loading" class="loading" />
      </button>
      <div class="hidden md:block md:col-span-9" />
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-accent" @click="runDB"
      >
        dry run on all scores
        <i v-if="loading" class="loading" />
      </button>
      <div class="hidden md:block md:col-span-3" />
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-primary"
        :disabled="!session.role.admin"
        @click="saveDB"
      >
        save to db
        <i v-if="loading" class="loading" />
      </button>
      <button
        class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-warning"
        :disabled="!compose._db || !session.role.admin"
        @click="confirm(t('delete-confirm')) && deleteDB()"
      >
        delete
        <i v-if="loading" class="loading" />
      </button>
    </div>
    <div v-if="data" class="py-4 space-y-4">
      <table
        v-for="ach, i in data" :key="i"
        class="table table-zebra caption-top"
      >
        <thead>
          <tr>
            <th scope="col">
              User
            </th>
            <th scope="col">
              Beatmap
            </th>
            <th scope="col" class="text-right">
              Score ID
            </th>
            <th scope="col" class="text-right">
              Score
            </th>
            <th scope="col" class="text-right">
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="result in ach.scores" :key="result.score.id">
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
            <td class="font-mono text-right">
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
            </td>
            <td class="font-mono text-right">
              {{ fmtScore(result.score.score) }}
            </td>
            <td class="font-mono text-right">
              {{ result.score.accuracy.toFixed(3) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>

</style>
