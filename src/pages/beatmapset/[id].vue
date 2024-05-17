<script setup lang="ts">
import { BeatmapSource, RankingStatus } from '~/def/beatmap'
import { Mode } from '~/def'
import { type AppScoresRankingSystemSwitcher } from '#components'
import type { Label } from '~/composables/useLinks'

definePageMeta({
  alias: ['/s/:id', '/beatmapsets/:id'],
})

const app = useNuxtApp()
const route = useRoute('beatmapset-id')
const { supportedModes, supportedRulesets, hasRankingSystem, hasRuleset }
  = useAdapterConfig()
const [switcher, setSwitcher] = useSwitcher()
const lazyBgCover = shallowRef('')
const { t } = useI18n()

const { data: beatmapset, error } = await useAsyncData(() =>
  app.$client.map.beatmapset.query({ id: route.params.id.toString() })
)

const queryBeatmap = route.query.beatmap?.toString()

const hashed = beatmapset.value?.beatmaps.find(
  bm => bm.md5 === queryBeatmap || bm.id === queryBeatmap
)
const selectedMapMd5 = shallowRef<string>(
  hashed?.md5 || beatmapset.value?.beatmaps[0].md5 || ''
)
const selectedMap = computed(() =>
  beatmapset.value?.beatmaps.find(bm => bm.md5 === selectedMapMd5.value)
)
const allowedModes = computed(() => {
  if (selectedMap.value?.mode === undefined) {
    return supportedModes
  }
  return selectedMap.value.mode !== Mode.Osu
    ? [selectedMap.value.mode]
    : supportedModes
})

const queryRankingSystem = route.query.rank?.toString()
const queryMode = route.query.mode?.toString()
const queryRuleset = route.query.ruleset?.toString()

setSwitcher({
  mode: includes(queryMode, supportedModes) ? queryMode : undefined,
  ruleset: includes(queryRuleset, supportedRulesets) ? queryRuleset : undefined,
})

if (
  queryRankingSystem
  && hasRuleset(switcher.mode, switcher.ruleset)
  && hasRankingSystem(switcher.mode, switcher.ruleset, queryRankingSystem)
) {
  setSwitcher({
    rankingSystem: queryRankingSystem,
  })
}

watch(selectedMapMd5, updateSwitcher)

const {
  data: leaderboard,
  refresh,
  pending: pendingLeaderboard,
} = await useAsyncData(async () => {
  if (!selectedMap.value) {
    return null
  }

  return await app.$client.rank.beatmap.query({
    ...switcher,
    page: 0,
    pageSize: 20,
    md5: selectedMap.value.md5,
  })
})

updateSwitcher()

const title = computed(
  () =>
    `${beatmapset.value?.meta.intl.artist} - ${beatmapset.value?.meta.intl.title} > ${selectedMap.value?.version}`
)
const description = computed(() => selectedMap.value?.version)
const url = useRequestURL()

useHead({
  title,
  titleTemplate: title => `${title} - ${app.$i18n.t(localeKey.server.name.__path__)}`,
})

useSeoMeta({
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: () => beatmapset.value?.assets.cover,
  ogUrl: () => url.href,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: () => beatmapset.value?.assets.list,
  twitterCard: 'summary',
})

const scoreRS = shallowRef<InstanceType<
  typeof AppScoresRankingSystemSwitcher
> | null>(null)

const links = shallowRef<{
  external: Label[]
  directDownload: Label[]
}>()

onBeforeMount(() => {
  beatmapset.value
    && isBanchoBeatmapset(beatmapset.value)
    && beatmapset.value.assets.cover
    && loadImage(beatmapset.value.assets.cover)
      .then(() => {
        lazyBgCover.value = `url(${beatmapset.value?.assets.cover})`
      })
      .catch(noop)

  links.value = beatmapset.value
    ? useExternalBeatmapsetLinks(beatmapset.value)
    : undefined
})

function rewriteAnchor() {
  const url = new URL(window.location.toString())
  if (selectedMap.value) {
    url.searchParams.set('beatmap', selectedMap.value.md5)
  }

  url.searchParams.set('rank', switcher.rankingSystem)
  url.searchParams.set('mode', switcher.mode)
  url.searchParams.set('ruleset', switcher.ruleset)
  history.replaceState({}, '', url)
}

function updateSwitcher() {
  if (!selectedMap.value) {
    return
  }
  if (selectedMap.value.mode !== Mode.Osu) {
    switcher.mode = selectedMap.value.mode
  }
}

async function update() {
  await refresh()
  updateSwitcher()
  rewriteAnchor()
}
</script>

<i18n lang="yaml">
en-GB:
  beatmapset:
    placement: '{title} by {artist}'
    external-links: External Links
    direct-downloads: Direct downloads
    creator: Creator
    status: Status
    beatmap-id: Beatmap ID
    source-id: Source | ID
    last-update: Last Update
    star-rating: Star Rating
    circle-size: Circle Size
    approach-rate: Approach Rate
    od: OD
    hp-drain: HP Drain
    duration: Duration
    hit-objects: Hit Objects
    hit-object:
      circles: circles
      sliders: sliders
      spinners: spinners
zh-CN:
  beatmapset:
    placement: "曲名:{title} \n 艺术家:{artist}"
    external-links: 其它链接
    direct-downloads: 直接下载
    creator: 铺师
    status: 状态
    beatmap-id: 铺面 ID
    source-id: 来源 | ID
    last-update: 上次更新时间
    star-rating: 难度星级
    circle-size: 圆圈大小
    approach-rate: 缩圈速度
    od: 准度要求
    hp-drain: 掉血速度
    duration: 长度
    hit-objects: 物件统计
    hit-object:
      circles: 圆圈
      sliders: 滑条
      spinners: 转盘
fr-FR:
  beatmapset:
    placement: '{title} par {artist}'
    external-links: Lien externe
    direct-downloads: Téléchargement direct
    creator: Créateur
    status: Statut
    beatmap-id: Beatmap ID
    source-id: Source | ID
    last-update: Dernière mise à jour
    star-rating: Difficulté en étoiles
    circle-size: Taille des cercles
    approach-rate: Taux d'approche
    od: Précision
    hp-drain: Drain de santé
    duration: Durée
    hit-objects: Hit Objects
    hit-object:
      circles: cercles
      sliders: sliders
      spinners: spinners

de-DE:
  beatmapset:
    placement: '{title} von {artist}'
    external-links: Externe Links
    direct-downloads: Direkter Download
    creator: Ersteller
    status: Status
    beatmap-id: Beatmap ID
    source-id: Quelle | ID
    last-update: Letztes Update
    star-rating: Sternebewertung
    circle-size: CS
    approach-rate: AR
    od: OD
    hp-drain: HP-Drain
    duration: Dauer
    hit-objects: Hit-Objekte
    hit-object:
      circles: Circles
      sliders: Sliders
      spinners: Spinner
</i18n>

<template>
  <section v-if="error" class="mx-auto section custom-container">
    <div>
      {{ formatGucchoErrorWithT(t, error) }}
    </div>
  </section>
  <div
    v-else-if="beatmapset"
    :class="[
      isBanchoBeatmapset(beatmapset) && `pre-bg-cover`,
      lazyBgCover !== '' && 'ready',
    ]"
  >
    <div class="container mx-auto custom-container">
      <div class="flex-wrap header-with-maps">
        <i18n-t
          keypath="beatmapset.placement"
          tag="p"
          class="text-lg font-light"
        >
          <template #title>
            <span
              class="z-10 text-2xl font-bold text-center sm:text-left lg:whitespace-nowrap"
            >
              {{ beatmapset.meta.intl.title }}
            </span>
          </template>
          <template #artist>
            <span class="text-xl font-semibold">
              {{ beatmapset.meta.intl.artist }}
            </span>
          </template>
        </i18n-t>
        <t-tabs
          v-model="selectedMapMd5"
          size="md"
          class="flex flex-wrap self-end mx-4 bg-transparent tabs-bordered"
          @update:model-value="update"
        >
          <t-tab
            v-for="bm in beatmapset.beatmaps"
            :key="bm.md5"
            :value="bm.md5"
            class="whitespace-nowrap grow"
          >
            {{ bm.version }}
          </t-tab>
        </t-tabs>
      </div>
      <div
        v-if="selectedMap"
        class="overflow-hidden card bg-gbase-200 dark:bg-gbase-900"
      >
        <div class="relative flex flex-col items-center m-2 md:flex-row">
          <t-tabs
            v-model="switcher.mode"
            class="md:mr-auto"
            @update:model-value="update"
          >
            <template v-for="m in allowedModes">
              <t-tab
                v-if="hasRuleset(m, switcher.ruleset)"
                :key="`sw-${m}`"
                :value="m"
              >
                <img
                  :alt="m"
                  :src="`/icons/mode/${m}.svg`"
                  class="color-theme-light-invert h-mode"
                >
              </t-tab>
            </template>
          </t-tabs>
          <t-tabs
            v-model="switcher.ruleset"
            variant=""
            @update:model-value="update"
          >
            <template v-for="r in supportedRulesets">
              <t-tab
                v-if="hasRuleset(switcher.mode, r)"
                :key="`sw-${r}`"
                :value="r"
              >
                {{ $t(localeKey.ruleset(r)) }}
              </t-tab>
            </template>
          </t-tabs>
        </div>
        <div class="flex flex-col md:flex-row">
          <div class="w-full md:w-1/3 grow">
            <div class="relative p-4 text-center md:p-3">
              <img
                class="mx-auto shadow-md rounded-xl min-w-1/2"
                :src="beatmapset.assets['list@2x']"
                :alt="selectedMap.version"
                :onerror="placeholder"
              >
              <div v-if="links" class="pt-2 text-start">
                <ul class="menu">
                  <li>
                    <h2 class="menu-title">
                      {{ t("beatmapset.direct-downloads") }}
                    </h2>
                    <ul>
                      <li
                        v-for="{ link, label } in links.directDownload"
                        :key="`direct-${label}`"
                      >
                        <a :href="link">{{ label }}</a>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <h2 class="menu-title">
                      {{ t("beatmapset.external-links") }}
                    </h2>
                    <ul>
                      <li
                        v-for="{ link, label } in links.external"
                        :key="`external-${label}`"
                      >
                        <a :href="link">{{ label }}</a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="w-full md:w-2/3">
            <dl>
              <div class="striped rounded-tl-xl">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.creator") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  {{ selectedMap.creator }}
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.status") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  {{ RankingStatus[selectedMap.status as any] }}
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.beatmap-id") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  {{ selectedMap.id }}
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.source-id") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  {{ BeatmapSource[beatmapset.source] }}
                  <template v-if="'foreignId' in selectedMap">
                    | {{ selectedMap.foreignId }}
                  </template>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.last-update") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  {{ selectedMap.lastUpdate }}
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  BPM
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/bpm.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.bpm }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.star-rating") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/overall-difficulty.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.starRate }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.circle-size") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/size.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.circleSize }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.approach-rate") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/approach-rate.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.approachRate }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.od") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/accuracy.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.accuracy }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.hp-drain") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/hp-drain.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.hpDrain }}</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.duration") }}
                </dt>
                <dd class="flex gap-1 striped-text">
                  <img
                    src="~/assets/icons/length.png"
                    alt=""
                    class="w-5 color-theme-light-invert"
                  >
                  <span>{{ selectedMap.properties.totalLength }} seconds</span>
                </dd>
              </div>
              <div class="striped">
                <dt class="text-sm font-medium text-gbase-500">
                  {{ t("beatmapset.hit-objects") }}
                </dt>
                <dd class="striped-text">
                  <span class="flex gap-1">
                    <img
                      src="~/assets/icons/circles.png"
                      alt=""
                      class="w-5 color-theme-light-invert"
                    >
                    <span>
                      {{ selectedMap.properties.count.circles }}
                      {{ t("beatmapset.hit-object.circles") }},</span>
                  </span>
                  <span class="flex gap-1">
                    <img
                      src="~/assets/icons/sliders.png"
                      alt=""
                      class="w-5 color-theme-light-invert"
                    >
                    <span>{{ selectedMap.properties.count.sliders }}
                      {{ t("beatmapset.hit-object.sliders") }},</span>
                  </span>
                  <span class="flex gap-1">
                    <img
                      src="~/assets/icons/spinners.png"
                      alt=""
                      class="w-5 color-theme-light-invert"
                    >
                    <span>{{ selectedMap.properties.count.spinners }}
                      {{ t("beatmapset.hit-object.spinners") }}</span>
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <AppScoresRankingSystemSwitcher
        ref="scoreRS"
        v-model="switcher.rankingSystem" class="mt-2" :mode="switcher.mode"
        :ruleset="switcher.ruleset" @update:model-value="update"
      />
      <div
        class="relative overflow-x-auto rounded-lg bg-base-100" :class="{
          '!rounded-tl-none': scoreRS?.rankingSystems[0] === switcher.rankingSystem,
          '!rounded-tr-none': scoreRS?.rankingSystems.at(-1) === switcher.rankingSystem,
        }"
      >
        <app-scores-table
          v-if="leaderboard" :scores="leaderboard" :ranking-system="switcher.rankingSystem"
          class="transition-opacity opacity-100 transition-filter"
          :class="{
            'clear-rounded-tl': scoreRS?.rankingSystems[0] === switcher.rankingSystem,
            'opacity-30 saturate-50 blur-md': pendingLeaderboard,
          }"
        />
        <div
          class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm" :class="{
            'opacity-100 !blur-none': pendingLeaderboard,
          }"
        >
          <div class="m-auto loading loading-lg" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
.header-with-maps {
  @apply sm:flex pb-0 mt-2 items-center justify-between text-gbase-900 dark:text-gbase-100;
  transition: 0.3s ease;
}

:deep(table.table.clear-rounded-tl) {
  > thead {
    tr:first-child {
      th:first-child {
        @apply rounded-tl-none;
      }
    }
  }
}

.safari .pre-bg-cover {
  transform: translate3d(0, 0, 0);
}

.pre-bg-cover {
  &:before {
    content: "";
    position: absolute;
    @apply top-20 left-0 right-0 bg-cover z-[-1];
    height: 30vmin;
  }

  &.ready::before {
    background-image: v-bind("lazyBgCover");
    animation: fadeIn 0.5s ease-out forwards;
  }
}

@keyframes fadeIn {
  0% {
    filter: opacity(0) contrast(0.5) brightness(1) blur(5em);
  }

  100% {
    filter: opacity(0.4) contrast(0.2) brightness(1.5) blur(3em);
  }
}

@media (prefers-color-scheme: dark) {
  @keyframes fadeIn {
    0% {
      filter: opacity(0) contrast(0.5) brightness(1) blur(5em);
    }

    100% {
      filter: opacity(1) contrast(0.5) brightness(0.5) blur(3em);
    }
  }
}

.h-mode {
  @apply transition duration-200 ease-in-out font-semibold cursor-pointer opacity-50;
  @apply sm:py-1 sm:my-0;
  @apply w-7 h-7;
}

.tab-active .h-mode {
  @apply opacity-100;
}
</style>
