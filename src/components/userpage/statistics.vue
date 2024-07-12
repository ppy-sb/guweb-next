<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ppRankingSystems } from '~/def'
import type {
  LeaderboardRankingSystem, PPRankingSystem,
} from '~/def/common'
import type { PPRank, ScoreRank } from '~/def/statistics'
import userpageStore from '~/store/userpage'

// const numbers = [...Array(10).keys()].map(String)
// const chars = [...numbers, ',', '.', 'K', 'M', 'B', 'T', '-']
// const percent = [...numbers, ',', '.', '%']

const page = userpageStore()
const {
  currentStatistic: data,
  user,
  currentRankingSystem,
} = storeToRefs(page)

// const setSwitcher = computed(() => page.switcher[1])

const scoreFmtCompact = createScoreFormatter({
  notation: 'compact',
  maximumFractionDigits: 2,
})
const scoreFmt = createScoreFormatter({ notation: undefined })
const deferredRender = shallowReactive({ ...data.value })
const playTime = computed(() =>
  deferredRender
    ? toDuration(new Date((deferredRender.playTime || 0) * 1000), new Date(0))
    : { hours: 0, minutes: 0, seconds: 0 },
)

const selectedRankingSystem = computed(() => page.switcher.rankingSystem)

watch(data, () => {
  for (const key in deferredRender) {
    // @ts-expect-error it's fine
    deferredRender[key] = data.value[key]
  }
})

const userLevelInt = computed(() => Math.floor(deferredRender.level || 0))
const userLevelPercent = computed(() =>
  (((deferredRender.level || 0) % 1) / 100).toLocaleString('en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
  }),
)
const ScoreToNextLevel = computed(
  () =>
    getRequiredScoreForLevel(userLevelInt.value + 1)
    - getRequiredScoreForLevel(userLevelInt.value),
)
</script>

<template>
  <div v-if="user" class="card">
    <div class="card-body p-0 md:p-4 xl:p-3">
      <div class="stats bg-transparent stats-vertical md:stats-horizontal">
        <div v-if="currentRankingSystem" class="stat">
          <div class="stat-title">
            Rank
          </div>
          <div class="stat-value font-mono">
            #{{ Intl.NumberFormat().format(currentRankingSystem.rank || 0) }}
            <!-- <Roller
              :char-set="chars"
              :value="`${Intl.NumberFormat().format(
                currentRankingSystem.rank || 0,
              )}`"
            /> -->
          </div>
          <div class="stat-desc flex gap-2 items-center">
            <template v-if="currentRankingSystem.countryRank">
              <img :src="getFlagURL(user.flag)" class="w-5">
              <div class="font-mono flex items-center">
                #{{ Intl.NumberFormat().format(currentRankingSystem.countryRank) }}
                <!-- <Roller
                  :char-set="chars"
                  :value="`${Intl.NumberFormat().format(
                    currentRankingSystem.countryRank || 0,
                  )}`"
                /> -->
              </div>
            </template>
            <div v-else class="stat-desc invisible">
              1
            </div>
          </div>
        </div>
        <div v-if="selectedRankingSystem" class="stat">
          <div class="stat-title">
            {{
              ppRankingSystems.includes(selectedRankingSystem as PPRankingSystem)
                ? "Performance"
                : "Score"
            }}
          </div>
          <div class="stat-value font-mono">
            <!-- <Roller
              :char-set="chars"
              class="font-mono"
              :value="ppRankingSystems.includes(selectedRankingSystem as PPRankingSystem) ? `${scoreFmt((currentRankingSystem as PPRank)?.performance)}` : scoreFmtCompact((deferredRender[selectedRankingSystem as LeaderboardRankingSystem] as ScoreRank).score as bigint)"
              default-value="-"
              :title="deferredRender.totalScore?.score"
            /> -->
            {{ ppRankingSystems.includes(selectedRankingSystem as PPRankingSystem) ? `${scoreFmt((currentRankingSystem as PPRank)?.performance)}` : scoreFmtCompact((deferredRender[selectedRankingSystem as LeaderboardRankingSystem] as ScoreRank).score as bigint) }}
          </div>
          <div class="stat-desc flex gap-1 items-center font-mono">
            <!-- <Roller
              :char-set="chars"
              class="font-mono"
              :value="scoreFmt(deferredRender.totalHits || 0)"
              default-value="-"
            /> -->
            {{ scoreFmt(deferredRender.totalHits || 0) }} total hits
          </div>
        </div>
        <div class="stat relative gap-0">
          <div class="stat-title">
            Level
          </div>
          <div class="stat-value font-mono">
            <!-- <Roller
              class="font-mono"
              :char-set="chars"
              :value="userLevelInt.toString()"
            /> -->
            {{ userLevelInt.toString() }}{{ userLevelPercent.slice(1) }}
            <!-- <Roller
              class="font-mono text-lg self-end pb-1"
              :char-set="percent"
              :value="`${userLevelPercent.slice(1)}`"
            /> -->
          </div>
          <div class="stat-desc flex gap-1 items-center font-mono">
            <!-- <Roller
              class="font-mono"
              :char-set="chars"
              :value="scoreFmt(ScoreToNextLevel)"
            /> -->
            {{ scoreFmt(ScoreToNextLevel) }} to Lv.{{ userLevelInt + 1 }}
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">
            Play Count
          </div>
          <div class="stat-value flex font-mono">
            <!-- <Roller
              class="font-mono"
              :char-set="chars"
              :value="scoreFmt(deferredRender.playCount || 0)"
            /> -->
            {{ scoreFmt(deferredRender.playCount || 0) }}
          </div>
          <div class="stat-desc flex gap-2">
            {{ playTime.hours }} H, {{ playTime.minutes }} M,
            {{ playTime.seconds }} S
          </div>
        </div>
        <div class="stat">
          <div class="stat-title">
            Max Combo
          </div>
          <div class="stat-value flex gap-1 items-center font-mono">
            <!-- <Roller
              class="font-mono"
              :char-set="chars"
              :value="scoreFmt(deferredRender.maxCombo || 0)"
            /> -->
            {{ scoreFmt(deferredRender.maxCombo || 0) }}
            <span class="font-light">x</span>
          </div>
          <div class="stat-desc invisible">
            1
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
::-webkit-progress-value {
  transition: width 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
}
</style>

<style scoped lang="postcss">
.stats {
  /* @apply grid-flow-row sm:grid sm:grid-cols-2 md:md:grid-cols-2 lg:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 */
  @apply flex flex-wrap justify-around;
}

.stats>.stat {
  @apply sm:w-1/2 md:w-min;
  border: 0;
  @apply py-2;
}

.stat-value,
.stat-desc {
  @apply flex;

  .roller {
    @apply flex-nowrap;
  }
}
</style>
