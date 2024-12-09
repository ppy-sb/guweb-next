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
  <div class="flex gap-2 px-1 lg:mx-0">
    <div class="h-20 w-14 shrink-0 md:w-24 transition-[width]">
      <picture
        v-if="beatmap
          && beatmapIsVisible(beatmap)
          && beatmap.beatmapset.source === BeatmapSource.Bancho"
      >
        <source v-if="beatmap.beatmapset.assets['list@2x']" :srcset="`${beatmap.beatmapset.assets.list} 1x, ${beatmap.beatmapset.assets['list@2x']} 2x`">
        <nuxt-img
          loading="lazy"
          :src="beatmap.beatmapset.assets.list"
          :alt="autoLocale(beatmap.beatmapset.meta).title"
          :onerror="onLazyImageError"
          class="object-cover w-full h-full shadow-md rounded-xl"
        />
      </picture>
      <icon v-else class="w-full h-full" name="clarity:unknown-status-line" size="100%" />
    </div>

    <div class="truncate shrink grow leading-[1]">
      <template
        v-if="beatmap && beatmapIsVisible(beatmap)"
      >
        <router-link
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
          <template v-if="meta">
            <span class="text-xs font-semibold md:text-sm transition-[font-size]">{{ meta.artist }}</span><br>
            <span class="text-sm font-bold md:text-lg transition-[font-size]">{{ meta.title }}</span>
          </template>
          <div class="leading-snug md:leading-tight">
            <icon
              v-if="rankingStatusIconMapping[beatmap.status]"
              size="100%"
              class="w-5 h-auto"
              :name="rankingStatusIconMapping[beatmap.status]!"
              :aria-label="beatmap.status"
            />
            <span v-if="beatmap" class="text-xs !leading-none font-semibold md:text-sm lg:text-md transition-[font-size]">
              {{ beatmap.version }}
            </span>
          </div>
        </router-link>
      </template>
      <div v-else>
        {{ t('unknown-beatmap') }}
      </div>
      <time class="text-xs italic lg:text-sm font-extralight transition-[font-size]">
        {{ score.playedAt.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'medium' }) }}
      </time>
    </div>
    <span v-if="score.mods.length" class="hidden p-1 mt-auto space-x-4 rounded-lg lg:block bg-neutral/40 tooltip tooltip-primary" :data-tip="score.mods.map(m => StableMod[m]).join(', ')">
      <app-mod v-for="mod in score.mods" :key="mod" :mod="mod" class="w-8 h-8 opacity-80" />
    </span>
    <div class="flex flex-col justify-between">
      <div class="flex justify-end text-lg lg:text-2xl transition-[font-size]">
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
      <div class="text-xs sm:text-sm lg:text-base text-end text-nowrap transition-[font-size]">
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

      <div class="text-xs sm:text-sm lg:text-base text-end text-nowrap transition-[font-size]">
        <span><b class="font-mono">{{ score.accuracy.toFixed(2) }}</b></span>
        <span class="text-light">% {{ $t('global.acc') }}</span>
      </div>
      <span v-if="score.mods.length" class="block px-2 mt-auto space-x-1 rounded-lg lg:hidden bg-neutral/40 tooltip tooltip-primary" :data-tip="score.mods.map(m => StableMod[m]).join(', ')">
        <app-mod v-for="mod in score.mods" :key="mod" :mod="mod" class="w-5 h-5" />
      </span>
    </div>
    <div class="self-center font-mono text-4xl text-center md:text-5xl w-14 md:w-20 transition-[font-size]">
      {{ score.grade }}
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
