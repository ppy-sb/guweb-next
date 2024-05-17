<script setup lang="ts">
/* eslint-disable no-irregular-whitespace */
import type { inferRouterOutputs } from '@trpc/server'
import { Mode, Rank } from '~/def'
import type { RankingSystem } from '~/def/common'
import type { ManiaHitCount, StandardHitCount } from '~/def/score'
import type { AppRouter } from '~/server/trpc/routers'

type RouterOutput = inferRouterOutputs<AppRouter>

type Score = NonNullable<RouterOutput['score']['id']>

defineProps<{
  score: Score
  rankingSystem: RankingSystem
}>()

const { hasRankingSystem, hasRuleset } = useAdapterConfig()

const { t } = useI18n()

const scoreFmt = createScoreFormatter({ notation: undefined })

function haveStandardHitCounts(input: Score): input is typeof input & { hit: StandardHitCount } {
  return input.mode !== Mode.Mania
}

function haveManiaHitCounts(input: Score): input is typeof input & { hit: ManiaHitCount } {
  return input.mode === Mode.Mania
}

const { locale } = useI18n()
</script>

<i18n lang="yaml">
en-GB:
  title: "{title}\nby {artist}"
  map: "{version}\nmade by {creator}"
  play: '{player} played at {time}'
  download-replay: Download replay

zh-CN:
  title: "曲名　\t\t{title}\n艺术家\t\t{artist}"
  map: "难度　\t\t{version}\n谱师　\t\t{creator}"
  play: '{player} 于 {time} 留下了此成绩'
  download-replay: 下载回放

fr-FR:
  title: '{title} par {artist}'
  map: '{version} créé par {creator}'
  play: '{player} joué le {time}'
  download-replay: Télécharger le replay

de-DE:
  title: "{title}\nvon {artist}"
  map: "{version}\nerstellt von {creator}"
  play: '{player} spielte am {time}'
  download-replay: Replay herunterladen
</i18n>

<template>
  <div v-if="beatmapIsVisible(score.beatmap)" class="flex flex-col items-stretch gap-4 md:flex-row">
    <div class="w-full md:max-w-32 grow">
      <img :src="score.beatmap.beatmapset.assets.list" class="mx-auto rounded-lg">
    </div>
    <div class="whitespace-pre-wrap">
      <i18n-t keypath="title" tag="p" class="font-light">
        <template #title>
          <nuxt-link-locale
            :to="{ name: 'beatmapset-id', params: { id: score.beatmap.beatmapset.id }, query: { mode: score.mode } }"
            class="text-2xl font-semibold g-link-style"
          >
            {{ autoLocale(score.beatmap.beatmapset.meta).title }}
          </nuxt-link-locale>
        </template>
        <template #artist>
          <span class="text-xl font-normal">
            {{ autoLocale(score.beatmap.beatmapset.meta).artist }}
          </span>
        </template>
      </i18n-t>
      <i18n-t keypath="map" tag="p" class="mt-4 font-light">
        <template #version>
          <nuxt-link-locale
            class="text-xl font-semibold g-link-style"
            :to="{ name: 'beatmapset-id', params: { id: score.beatmap.beatmapset.id }, query: { beatmap: score.beatmap.md5, mode: score.mode } }"
          >
            {{ score.beatmap.version }} (<img src="~/assets/icons/overall-difficulty.png" alt="" class="inline w-6 align-middle color-theme-light-invert">{{ score.beatmap.properties.starRate }})
          </nuxt-link-locale>
        </template>
        <template #creator>
          <span class="text-lg font-semibold">{{ score.beatmap.creator }}</span>
        </template>
      </i18n-t>
    </div>
  </div>
  <i18n-t keypath="play" tag="div" class="flex items-center pt-4 font-light gap-x-1">
    <template #player>
      <nuxt-link-locale
        class="inline-flex gap-1"
        :to="{
          name: 'user-handle',
          params: {
            handle: `@${score.user.safeName}`,
          },
        }"
      >
        <img class="object-cover mask mask-squircle" width="30" :src="score.user.avatarSrc" :alt="score.user.name">
        <div class="text-xl font-bold g-link-style">
          {{ score.user.name }}
        </div>
      </nuxt-link-locale>
    </template>
    <template #time>
      <span class="font-semibold underline decoration-dashed">
        {{ score.playedAt.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'full' }) }}
      </span>
    </template>
  </i18n-t>
  <div class="divider" />
  <div class="flex flex-col items-center mt-4 md:flex-row">
    <div class="grid items-baseline w-full grid-cols-3 md:grid-cols-6 gap-y-3 gap-x-1">
      <div class="col-span-2 font-mono text-4xl text-end md:col-span-5">
        {{ scoreFmt(score.score) }}
      </div>

      <template v-if="hasRuleset(score.mode, score.ruleset) && hasRankingSystem(score.mode, score.ruleset, Rank.PPv2)">
        <span class="col-span-2 font-mono text-2xl md:col-span-5 text-end">{{ scoreFmt(score[Rank.PPv2].pp) }}</span>
        <span class="text-xl">{{ $t(localeKey.root.global.pp.__path__) }}</span>
      </template>

      <div class="col-span-3 -my-2 divider md:col-span-6" />

      <template v-if="haveManiaHitCounts(score)">
        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[300]) }}</span>
        <span>x 300</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit.max) }}</span>
        <span>x 300P</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[200]) }}</span>
        <span>x 200</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[100]) }}</span>
        <span>x 100</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[50]) }}</span>
        <span>x 50</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit.miss) }}</span>
        <span>x miss</span>
      </template>

      <template v-else-if="haveStandardHitCounts(score)">
        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[300]) }}</span>
        <span>x 300</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit.geki) }}</span>
        <span>x geki</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[100]) }}</span>
        <span>x 100</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit.katu) }}</span>
        <span>x katu</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit[50]) }}</span>
        <span>x 50</span>

        <span />
        <span class="font-mono text-4xl text-end">{{ scoreFmt(score.hit.miss) }}</span>
        <span>x miss</span>
      </template>

      <div class="col-span-3 -my-2 md:col-span-6 divider" />

      <span class="text-xl text-nowrap">{{ $t(localeKey.root.global.accuracy.__path__) }}</span>
      <span class="font-mono text-2xl text-end">{{ score.accuracy }}</span>
      <span class="text-lg">%</span>

      <span class="text-xl text-nowrap">{{ $t(localeKey.root.global['max-combo'].__path__) }}</span>
      <span class="font-mono text-2xl text-end">{{ score.maxCombo }}</span>
      <span class="text-lg">x</span>
    </div>
    <div class="flex min-w-54">
      <span class="mx-auto text-8xl">
        {{ score.grade }}
      </span>
    </div>
  </div>
  <div class="divider" />
  <div>
    <a rel="nofollow" :href="`/replay/${score.id}/download`" class="btn btn-shadow btn-primary">{{ t('download-replay') }} <icon name="line-md:download-loop" class="w-5 h-5" /></a>
  </div>
</template>
