<script setup lang="ts">
import type { RankingSystem } from '~/def/common'
import { type Mode, type Ruleset } from '~/def'
import type { ModeRulesetScoreStatistic } from '~/def/statistics'

const app = useNuxtApp()
const route = useRoute<'admin-users-id-stats'>()

const id = route.params.id
const user = await app.$client.user.uniqueIdent.query(id)
if (!user) {
  await navigateTo('/admin/users')
}
const [sw, setSw] = useSwitcher()

const stored = ref<ModeRulesetScoreStatistic>()
const computed = ref<ModeRulesetScoreStatistic>()

async function switchMode(v: Partial<{ mode: Mode; ruleset: Ruleset; rankingSystem: RankingSystem }>) {
  setSw(v)
  loadStored()
}

async function loadStored() {
  const { mode, ruleset } = sw
  stored.value = await app.$client.admin.userManagement.userModeStat.query({ id, mode, ruleset })
  console.log(stored)
}

async function loadIntegrity() {
  const { mode, ruleset } = sw
  computed.value = await app.$client.admin.userManagement.computeUserStat.query({ id, mode, ruleset })
  console.log(computed)
}
</script>

<template>
  <div class="container mx-auto max-w-screen-xl">
    <app-mode-switcher :model-value="sw" class="self-start" @update:model-value="switchMode" />
    <button class="btn btn-sm">
      refresh stored
    </button>
    <button class="btn btn-sm" @click="loadIntegrity">
      get computed
    </button>
    <span>{{ stored?.toString() }}</span>
    <button class="btn btn-sm btn-success">
      ->
    </button>
    <span>{{ computed?.toString() }}</span>
    <button class="btn btn-sm btn-danger">
      save
    </button>
  </div>
</template>

<style scoped>

</style>
