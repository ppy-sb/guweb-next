<script setup lang="ts">
import type { RankingSystem } from '~/def/common'
import { type Mode, type Ruleset } from '~/def'
import type { ModeRulesetScoreStatistic } from '~/def/statistics'
import { Grade } from '~/def/score'

const app = useNuxtApp()
const route = useRoute<'admin-users-id-stats'>()

const fmt = createNumberFormatter()

const id = route.params.id
const user = await app.$client.user.uniqueIdent.query(id)
const pending = ref(false)
if (!user) {
  await navigateTo('/admin/users')
}
const [sw, setSw] = useSwitcher()

const defStat: ModeRulesetScoreStatistic = {
  totalScore: 0n,
  totalHits: 0n,
  playTime: 0,
  playCount: 0,
  level: 0,
  maxCombo: 0,
  rankedScore: 0n,
  scoreRankComposition: {
    [Grade.F]: 0,
    [Grade.D]: 0,
    [Grade.C]: 0,
    [Grade.B]: 0,
    [Grade.A]: 0,
    [Grade.S]: 0,
    [Grade.SH]: 0,
    [Grade.SS]: 0,
    [Grade.SSH]: 0,
  },
}
const modal = ref<{
  showModal: () => void
}>()

const current = ref<ModeRulesetScoreStatistic>(structuredClone(defStat))
const db = ref<ModeRulesetScoreStatistic>(structuredClone(defStat))
const calculated = ref<ModeRulesetScoreStatistic>()

const sql = ref<{ params: unknown[]; sql: string }>()
const error = ref<Error>()
const injectSql = computed(() => sql.value ? sql.value.sql.split('?').map((i, idx) => `${i}${sql.value!.params[idx] ?? ''}`).join('') : '')

const failSafe_anyStateLoaded = ref(false)

async function switchMode(v: Partial<{ mode: Mode; ruleset: Ruleset; rankingSystem: RankingSystem }>) {
  setSw(v)
  transaction(() => Promise.allSettled([
    loadStored(),
    loadIntegrity(),
  ]))
}

async function loadStored() {
  failSafe_anyStateLoaded.value = true
  const { mode, ruleset } = sw
  const res = await app.$client.admin.userManagement.userModeStat.query({ id, mode, ruleset })
  current.value = structuredClone(res)
  db.value = structuredClone(res)
}

async function loadIntegrity() {
  failSafe_anyStateLoaded.value = true
  const { mode, ruleset } = sw
  calculated.value = await app.$client.admin.userManagement.computeUserStat.query({ id, mode, ruleset })
}

function overwrite() {
  if (!calculated.value) {
    return
  }
  current.value = {
    ...current.value,
    ...calculated.value,
  }
}

async function transaction(cb: () => Promise<any>, flag = pending) {
  flag.value = true
  await cb()
  flag.value = false
}

function compareReturnClass(key: (v: ModeRulesetScoreStatistic) => unknown) {
  return {
    'input-warning': current.value && calculated.value && key(current.value) !== key(calculated.value),
    'input-info': current.value && db.value && key(current.value) !== key(db.value),
    // 'input-neutral': current.value && computed.value && db.value && key(current.value) === key(computed.value) && key(current.value) === key(db.value),
  }
}

async function save() {
  error.value = undefined
  const stat = structuredClone({
    ...current.value,
    scoreRankComposition: {
      ...current.value.scoreRankComposition,
    },
  })
  for (const [i, value] of Object.entries(stat).filter((v): v is [Exclude<keyof typeof db.value, 'scoreRankComposition'>, number | bigint] => v[0] !== 'scoreRankComposition')) {
    if (value === db.value[i]) {
      delete stat[i]
    }

    const newVal: any = (value as number) - (db.value[i] as number)

    if (newVal === 0 || newVal === 0n) {
      delete stat[i]
    }
    else {
      // @ts-expect-error wtf
      stat[i] = newVal
    }
  }
  for (const [i, value] of Object.entries(stat.scoreRankComposition)) {
    const _i = i as keyof typeof stat.scoreRankComposition
    if (value === db.value.scoreRankComposition[_i]) {
      delete stat.scoreRankComposition[_i]
    }
    const newVal = value - db.value.scoreRankComposition[_i]
    if (newVal !== 0) {
      stat.scoreRankComposition[_i] = newVal
    }
    else {
      delete stat.scoreRankComposition[_i]
    }
  }

  try {
    sql.value = await app.$client.admin.userManagement.temp_userUpdateStatGenSQL.query({ id, mode: sw.mode, ruleset: sw.ruleset, stat })
    modal.value?.showModal()
  }
  catch (e) {
    if (e instanceof Error) {
      error.value = e
    }
  }
}
</script>

<template>
  <div class="container mx-auto max-w-screen-xl flex flex-col">
    <app-mode-switcher :model-value="sw as any" class="mx-auto" @update:model-value="switchMode as any" />
    <div class="relative mx-auto">
      <div v-if="error" class="alert alert-error my-2">
        <span>{{ error.message }}</span>
        <button class="btn btn-sm btn-ghost ms-auto" @click="error = undefined">
          x
        </button>
      </div>
      <div
        class="flex gap-4 transition-[filter] transition-opacity" :class="{
          'opacity-30 saturate-50 blur': pending,
        }"
      >
        <div>
          <button class="btn btn-sm btn-info w-full" @click="transaction(loadIntegrity)">
            compute
          </button>
          <div v-if="calculated" class="mt-2">
            <dl>
              <dt>ranked score</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.rankedScore) }}
                </div>
              </dd>
              <dt>total score</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.totalScore) }}
                </div>
              </dd>
              <dt>total hits</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.totalHits) }}
                </div>
              </dd>
              <dt>play time</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.playTime) }}
                </div>
              </dd>
              <dt>play count</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.playCount) }}
                </div>
              </dd>
              <dt>max combo</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(calculated.maxCombo) }}
                </div>
              </dd>
              <!-- <dt>level</dt>
              <dd>
                <div class="input input-sm input-disabled text-end">
                  {{ fmt(computed.level) }}
                </div>
              </dd> -->
              <template v-for="_, key in defStat.scoreRankComposition" :key="key">
                <dt>rank.{{ key }}</dt>
                <dd>
                  <div class="input input-sm input-disabled text-end">
                    {{ fmt(calculated.scoreRankComposition[key]) }}
                  </div>
                </dd>
              </template>
            </dl>
          </div>
        </div>
        <div>
          <button class="btn btn-sm btn-success" :disabled="!calculated" @click="overwrite">
            ->
          </button>
        </div>
        <div>
          <button class="btn btn-sm btn-info w-full" @click="transaction(loadStored)">
            load db
          </button>
          <div class="mt-2">
            <dl>
              <dt>ranked score</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.rankedScore" :formatter="fmt" class="input input-sm"
                  :class="compareReturnClass(v => v.rankedScore)"
                />
              </dd>
              <dt>total score</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.totalScore" :formatter="fmt"
                  :class="compareReturnClass(v => v.totalScore)" class="input input-sm"
                />
              </dd>
              <dt>total hits</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.totalHits" :formatter="fmt"
                  :class="compareReturnClass(v => v.totalHits)" class="input input-sm"
                />
              </dd>
              <dt>play time</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.playTime" :formatter="fmt" :class="compareReturnClass(v => v.playTime)"
                  class="input input-sm"
                />
              </dd>
              <dt>play count</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.playCount" :formatter="fmt"
                  :class="compareReturnClass(v => v.playCount)" class="input input-sm"
                />
              </dd>
              <dt>max combo</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.maxCombo" :formatter="fmt" :class="compareReturnClass(v => v.maxCombo)"
                  class="input input-sm"
                />
              </dd>
              <!-- <dt>level</dt>
              <dd class="masked">
                <t-masked-input
                  v-model="current.level" :formatter="fmt"
                  :class="compareReturnClass(v => v.level)" class="input input-sm"
                />
              </dd> -->
              <template v-for="_, key in defStat.scoreRankComposition" :key="key">
                <dt>rank.{{ key }}</dt>
                <dd class="masked">
                  <t-masked-input
                    v-model="current.scoreRankComposition[key]" :formatter="fmt"
                    :class="compareReturnClass(v => v.scoreRankComposition[key])" class="input input-sm"
                  />
                </dd>
              </template>
            </dl>
          </div>
        </div>
        <button class="btn btn-sm btn-danger" :disabled="!failSafe_anyStateLoaded" @click="save">
          save
        </button>
      </div>
      <div class="divider" />
      <div
        class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm"
        :class="{
          'opacity-100 !blur-none': pending,
        }"
      >
        <div class="m-auto loading loading-lg" />
      </div>
    </div>
  </div>
  <t-modal v-slot="{ closeModal }" ref="modal" class="m-auto">
    <div class="card bg-base-200 p-2">
      <span class="card-title">save</span>
      <div class="card-body">
        <span>Under evaluation. Execute the following SQL:</span>
        <pre>
        <code class="whitespace-pre-wrap">
{{ injectSql }}
        </code>
      </pre>
      </div>
      <div class="card-actions grid grid-cols-2 p-4">
        <button class="btn btn-success" @click="() => closeModal()">
          ok
        </button>
        <button class="btn btn-success" @click="() => closeModal()">
          confirm
        </button>
      </div>
    </div>
  </t-modal>
</template>

<style scoped>
</style>
