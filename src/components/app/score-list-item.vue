<script setup lang="ts">
import {
  Rank,
  leaderboardScoreRankingSystems,
  ppRankingSystems,
} from '~/def'
import { BeatmapSource, RankingStatus } from '~/def/beatmap'
import type { ActiveMode, ActiveRuleset, LeaderboardPPRankingSystem, LeaderboardRankingSystem, LeaderboardScoreRankingSystem } from '~/def/common'
import { type RankingSystemScore, StableMod } from '~/def/score'

const props = withDefaults(
  defineProps<{
    score: RankingSystemScore<string, string, ActiveMode, LeaderboardRankingSystem>
    mode: ActiveMode
    ruleset: ActiveRuleset
    rankingSystem: LeaderboardRankingSystem
    useIntl?: boolean
  }>(),
  {
    useIntl: true,
  },
)

const rankingStatusIconMapping: Partial<Record<RankingStatus, string>> = {
  [RankingStatus.Approved]: 'line-md:circle-to-confirm-circle-transition',
  [RankingStatus.Ranked]: 'line-md:chevron-small-triple-up',
  [RankingStatus.Pending]: 'line-md:alert',
  [RankingStatus.Loved]: 'line-md:heart-filled',
  [RankingStatus.Qualified]: 'line-md:confirm',
}

const numberFmt = createNumberFormatter()
const beatmap = computed(() => {
  if (!props.score || !beatmapIsVisible(props.score.beatmap)) {
    return
  }
  return props.score.beatmap
})
const meta = computed(
  (): {
    artist: string
    title: string
  } | void => {
    if (!beatmap.value) {
      return
    }
    if (!beatmapIsVisible(beatmap.value)) {
      return
    }

    if (props.useIntl) {
      return beatmap.value.beatmapset.meta.intl
    }
    else {
      return {
        artist:
          beatmap.value.beatmapset.meta.artist
          || beatmap.value.beatmapset.meta.intl.artist,
        title:
          beatmap.value.beatmapset.meta.title
          || beatmap.value.beatmapset.meta.intl.title,
      }
    }
  },
)

const { t, locale } = useI18n()
</script>

<i18n lang="yaml">
en-GB:
  unknown-beatmap: Unknown Beatmap
  detail: Detail

zh-CN:
  unknown-beatmap: 未知铺面
  detail: 详情

fr-FR:
  unknown-beatmap: Beatmap Inconnue
  detail: Detail

de-DE:
  unknown-beatmap: Unbekannte Beatmap
  detail: Detail
</i18n>

<template>
  <div class="score">
    <div class="flex justify-between">
      <div class="flex min-w-0 gap-4">
        <div class="hidden md:block">
          <picture
            v-if="beatmap
              && beatmapIsVisible(beatmap)
              && beatmap.beatmapset.source === BeatmapSource.Bancho"
          >
            <source v-if="beatmap.beatmapset.assets['list@2x']" :srcset="`${beatmap.beatmapset.assets.list} 1x, ${beatmap.beatmapset.assets['list@2x']} 2x`">
            <img
              :src="beatmap.beatmapset.assets.list"
              :alt="autoLocale(beatmap.beatmapset.meta).title"
              :onerror="placeholder"
              class="object-cover w-20 h-16 shadow-md rounded-xl"
            >
          </picture>
          <icon v-else class="w-20 h-16" name="clarity:unknown-status-line" size="100%" />
        </div>
        <div class="flex flex-col min-w-0">
          <router-link
            v-if="beatmap && beatmapIsVisible(beatmap)"
            class="truncate"
            :to="{
              name: 'beatmapset-id',
              params: {
                id: beatmap.beatmapset.id as string,
              },
              query: {
                beatmap: beatmap.id as string,
                mode: props.mode,
                ruleset: props.ruleset,
                rank: [Rank.TotalScore, Rank.RankedScore].includes(
                  props.rankingSystem,
                )
                  ? 'score'
                  : props.rankingSystem,
              },
            }"
          >
            <icon
              v-if="rankingStatusIconMapping[beatmap.status]"
              size="100%"
              class="w-5 h-5 md:w-6 md:h-6"
              :name="rankingStatusIconMapping[beatmap.status]!"
              :aria-label="beatmap.status"
            />
            <span v-if="meta" class="text-sm font-bold truncate md:text-md xl:text-lg">
              {{ meta.artist }} - {{ meta.title }}
            </span>
            <div class="absolute flex flex-wrap gap-2 text-xs md:text-sm lg:text-md">
              <span v-if="beatmap" class="font-semibold">
                {{ beatmap.version }}
              </span>
              <span v-if="score.mods.length" class="flex justify-end gap-1 tooltip tooltip-primary lg:tooltip-right" :data-tip="score.mods.map(m => StableMod[m]).join(', ')">
                <app-mod v-for="mod in score.mods" :key="mod" :mod="mod" class="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
              </span>
            </div>
            <div class="text-xs md:text-sm lg:text-md opacity-0 pointer-events-none">
              IM HERE TO TAKE HEIGHT
            </div>
          </router-link>
          <div v-else>
            {{ t('unknown-beatmap') }}
          </div>
          <div class="mt-auto map-date">
            <time class="text-xs italic lg:text-sm font-extralight">
              {{ score.playedAt.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'full' }) }}
            </time>
          </div>
        </div>
      </div>
      <div class="relative flex">
        <div class="flex flex-col">
          <div class="flex items-center justify-end flex-grow text-lg sm:text-xl lg:text-2xl">
            <template v-if="(ppRankingSystems).includes(props.rankingSystem as LeaderboardPPRankingSystem)">
              <div class="font-mono font-bold">
                {{ score.pp.toFixed(2) }}
              </div>
              <span class="font-light">{{ $t('global.pp') }}</span>
            </template>
            <template v-else-if="(leaderboardScoreRankingSystems).includes(props.rankingSystem as LeaderboardScoreRankingSystem)">
              <div class="font-mono font-bold">
                {{ numberFmt(score.score) }}
              </div>
            </template>
          </div>
          <div class="justify-end mt-auto text-sm md:text-md lg:text-md whitespace-nowrap">
            <div class="text-right">
              <template v-if="beatmap">
                <span class="font-semibold align-middle">
                  {{ score.maxCombo }}
                </span>
                <span class="font-light align-middle">
                  /
                </span>
                <span class="align-middle">
                  {{ beatmap.properties.maxCombo }}
                </span>
              </template>
              <span v-else class="align-middle">
                {{ score.maxCombo }}
              </span>
              <span class="font-light align-middle">
                x
              </span>
            </div>

            <span class="text-right">
              <span><b class="font-mono">{{ score.accuracy.toFixed(2) }}</b></span>
              <span class="text-light">% {{ $t('global.acc') }}</span>
            </span>
          </div>
        </div>
        <div class="font-mono text-4xl text-center md:text-5xl w-14 md:w-20">
          {{ score.grade }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.score {
  @apply py-2;
}

.score + .score {
  @apply border-t-2 border-gbase-500/20;
}
</style>
