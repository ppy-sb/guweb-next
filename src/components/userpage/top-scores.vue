<script setup lang="ts">
import type { Ref } from 'vue'
import {
  type Mode,
  leaderboardRankingSystems,
  leaderboardScoreRankingSystems,
  modes,
  rulesets,
} from '~/def'
import type { RankingStatus } from '~/def/beatmap'
import type {
  LeaderboardRankingSystem,
  LeaderboardScoreRankingSystem,
  PPRankingSystem,
  ScoreRankingSystem,
} from '~/def/common'
import type { RankingSystemScore } from '~/def/score'
import userpageStore from '~/store/userpage'

const app = useNuxtApp()
const { t } = useI18n()
const page = userpageStore()

let prevSwitcherState = {
  ...page.switcher as UnwrapShallowReactive<typeof page['switcher']>,
}
function stabilizeScoreRank(rankingSystem: LeaderboardRankingSystem) {
  if (
    leaderboardScoreRankingSystems.includes(
      rankingSystem as LeaderboardScoreRankingSystem,
    )
  ) {
    return 'score' as ScoreRankingSystem
  }
  return rankingSystem as PPRankingSystem
}
function switchBetweenScoreRanks() {
  return prevSwitcherState.rankingSystem !== page.switcher.rankingSystem
    && stabilizeScoreRank(prevSwitcherState.rankingSystem)
    === stabilizeScoreRank(page.switcher.rankingSystem)
}
const topPage = shallowRef(0)

const {
  data: top,
  error: errorTop,
  refresh: refreshTop,
  pending: pendingTop,
} = await useAsyncData(async () => {
  if (
    !page.user
    || !page.switcher.mode
    || !page.switcher.ruleset
    || !page.switcher.rankingSystem
  ) {
    return {
      count: 0,
      scores: [],
      handle: page.user?.id,
      page: topPage.value,
      lastSwitcherStatus: {
        ...page.switcher,
      },
    }
  }
  const val = await app.$client.user.tops.query({
    handle: page.user.id,
    mode: page.switcher.mode,
    ruleset: page.switcher.ruleset,
    rankingSystem: page.switcher.rankingSystem as PPRankingSystem,
    page: topPage.value,
  }) as {
    count: number
    scores: RankingSystemScore<string, string, Mode, LeaderboardRankingSystem, RankingStatus>[]
  }
  return {
    ...val,

    page: topPage.value,
    handle: page.user.id,
    lastSwitcherStatus: {
      ...page.switcher,
    },
  }
})
watch([() => page.user, topPage], async () => {
  if (!page.user) {
    return
  }
  await refreshTop()
})
const transition = shallowRef<'left' | 'right'>('left')
onMounted(() => {
  const animationDirection = <T extends readonly any[]>(
    val: T[number],
    prevVal: T[number],
    array: T,
  ) => {
    const [idx, prevIdx] = [array.indexOf(val), array.indexOf(prevVal)]
    if (idx === prevIdx) {
      return
    }
    if (idx > prevIdx) {
      return 'right'
    }
    else {
      return 'left'
    }
  }

  // transition direction
  const arrayMap = {
    mode: modes,
    ruleset: rulesets,
    rankingSystem: leaderboardRankingSystems,
  } as const

  const computeAnimateDirection = () => {
    const sw = page.switcher

    for (const [key, switcherState] of Object.entries(sw)) {
      const [value, previousValue] = [
        switcherState,
        prevSwitcherState[key as keyof typeof prevSwitcherState],
      ]
      const direction = animationDirection(
        value,
        previousValue,
        arrayMap[key as keyof typeof prevSwitcherState],
      )
      if (!direction) {
        continue
      }
      transition.value = direction
      break
    }
  }
  watch(() => page.switcher, (sw) => {
    if (switchBetweenScoreRanks()) {
      prevSwitcherState = { ...sw }
      return
    }
    // reset bp page
    topPage.value = 0
    // animate
    computeAnimateDirection()
    refreshTop()
    prevSwitcherState = { ...sw }
  })
})
function prevPage(val: Ref<number>) {
  transition.value = 'left'
  if (val.value > 0) {
    val.value -= 1
  }
}
function nextPage(val: Ref<number>) {
  transition.value = 'right'
  if (val.value < 9) {
    val.value += 1
  }
}

const prevTop = prevPage.bind(null, topPage)
const nextTop = nextPage.bind(null, topPage)
</script>

<i18n src="./scores.base.yaml" lang="yaml" />

<i18n lang="yaml">
en-GB:
  top: Top Ranks
  loading: Loading Top Scores...

zh-CN:
  top: 排行榜
  loading: 正在加载排行榜

fr-FR:
  top: Premières places
  loading: Chargement des Scores...

de-DE:
  top: Top Ränge
  loading: Lade Top Scores...
</i18n>

<template>
  <div v-if="errorTop">
    {{ errorTop }}
  </div>
  <template v-else-if="page.user">
    <div class="space-y-6">
      <section v-if="top?.count">
        <div class="card" :class="[pendingTop && 'pointer-events-none']">
          <!-- <div
            class="justify-center p-1 card-title rounded-2xl bg-gbase-300/30"
          >
            First Ranks ({{ top.count }})
          </div> -->
          <div class="p-1 two-tone flex items-center w-100">
            <icon name="pajamas:first-contribution" class="w-1/6 text-3xl opacity-70" />
            <div class="w-2/3 flex">
              <div class="text-3xl font-semibold mx-auto">
                {{ t('top') }}
              </div>
            </div>
            <div class="w-1/6 flex">
              <div class="text-2xl mx-auto font-light italic opacity-90">
                {{ top.count }}
              </div>
            </div>
          </div>
          <div
            class="transition-[filter] transition-opacity duration-200" :class="{
              'saturate-50 opacity-30': pendingTop,
            }"
          >
            <div class="relative">
              <transition :name="transition">
                <ul
                  :key="top.lastSwitcherStatus.mode
                    + top.lastSwitcherStatus.ruleset
                    + stabilizeScoreRank(top.lastSwitcherStatus.rankingSystem)
                    + page.user.id
                    + top.page
                  "
                >
                  <li v-for="i in top.scores" :key="`bests-${i.id}`" class="score">
                    <app-score-list-item
                      :score="i" :mode="top.lastSwitcherStatus.mode"
                      :ruleset="top.lastSwitcherStatus.ruleset" :ranking-system="top.lastSwitcherStatus.rankingSystem"
                    />
                  </li>
                </ul>
              </transition>
            </div>
          </div>
          <div
            class="btn-group flex w-full bg-gbase-300/30 dark:bg-gbase-700/50 rounded-2xl shadow"
            style="--rounded-btn: 1rem"
          >
            <button class="btn btn-ghost" :disabled="topPage === 0" @click="prevTop">
              «
            </button>
            <button class="btn btn-ghost grow" @click="refreshTop()">
              {{ t('page', { page: topPage + 1 }) }}
            </button>
            <button class="btn btn-ghost" :disabled="top.scores.length < 10" @click="nextTop">
              »
            </button>
          </div>
        </div>
      </section>
      <div v-else-if="!top?.scores.length && pendingTop">
        {{ t('loading') }}
      </div>
    </div>
  </template>
</template>
