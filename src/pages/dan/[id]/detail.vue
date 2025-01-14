<script setup lang="ts">
import { Requirement } from '~/def/dan'
import { useSession } from '~/store/session'

const fmtScore = createNumberFormatter()
const tRequirement = localeKey.root.dan.requirement

const app = useNuxtApp()
const { t } = useI18n()
const route = useRoute('dan-id-detail')
const session = useSession()

const item = await app.$client.dan.get.query(route.params.id)

const pagination = reactive({
  [Requirement.Pass]: {
    page: 0,
    perPage: 10,
  },
  [Requirement.NoPause]: {
    page: 0,
    perPage: 10,
  },
})

const qualifiedScores = ref({
  [Requirement.Pass]: await app.$client.dan.getQualifiedScores.useQuery(computed(() => ({
    id: route.params.id,
    requirement: Requirement.Pass,
    page: pagination[Requirement.Pass].page,
    perPage: pagination[Requirement.Pass].perPage,
  }))),
  [Requirement.NoPause]: await app.$client.dan.getQualifiedScores.useQuery(computed(() => ({
    id: route.params.id,
    requirement: Requirement.NoPause,
    page: pagination[Requirement.NoPause].page,
    perPage: pagination[Requirement.NoPause].perPage,
  }))),
})

async function toPage(requirement: Requirement, page: number) {
  pagination[requirement].page = page
}
</script>

<i18n lang="yaml">
en-GB:
  qf-scores: Qualified Scores
  load-qualified-scores: load qualified scores
  mode: Mode...
  ruleset: Rule...
  unset: Unset
  treat-no-ruleset-cond-as-standard: treat dans with no ruleset requirement as standard

zh-CN:
  qf-scores: 满足条件的成绩
  load-qualified-scores: 加载满足条件的成绩
  mode: 模式
  ruleset: 玩法
  unset: 未指定
  treat-no-ruleset-cond-as-standard: 将无玩法要求的段位视为std端位

# TODO fr, DE
</i18n>

<template>
  <div class="container px-4 mx-auto custom-container">
    <nuxt-link-locale v-if="session.role.staff" class="btn" :to="{ name: 'dan-compose', query: { id: item.id } }">
      Edit
    </nuxt-link-locale>

    <h1 class="mb-2 text-3xl link">
      {{ item.name }}
    </h1>
    <p class="whitespace-pre-wrap">
      {{ item.description }}
    </p>
    <dan-explain-requirement v-for="requirement in item.requirements" :key="requirement.type" :requirement="requirement" />
    <h2 class="w-full text-xl font-bold divider">
      {{ t('qf-scores') }}
    </h2>
    <div v-for="requirement in item.requirements" :key="requirement.type">
      <h3 class="mb-2 text-lg font-bold">
        {{ t(tRequirement[requirement.type].__path__) }}
      </h3>
      <div class="relative mb-2 overflow-x-auto border rounded-md border-base-300">
        <table
          class="table transition-all table-sm table-zebra"
          :class="{
            'opacity-30 saturate-50 blur-md': qualifiedScores[requirement.type].status === 'pending',
          }"
        >
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
            <tr v-for="result in qualifiedScores[requirement.type].data?.scores" :key="result.score.id">
              <th scope="row" class="whitespace-nowrap">
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
              <td class="whitespace-nowrap">
                <a
                  :href="`/b/${result.beatmap.id}`"
                  class="link text-sky-500"
                >
                  {{ result.beatmap.artist }} - {{ result.beatmap.title }} [{{ result.beatmap.version }}]
                </a>
              </td>
              <td class="whitespace-nowrap">
                <nuxt-link-locale
                  class="link text-sky-500"
                  :to="{
                    name: 'score-id',
                    params: {
                      id: result.score.id,
                    },
                  }"
                >
                  id={{ result.score.id }}
                  (acc={{ result.score.accuracy }}%, score={{ fmtScore(result.score.score) }})
                </nuxt-link-locale>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur"
          :class="{
            'opacity-100 blur-none': qualifiedScores[requirement.type].status === 'pending',
          }"
        >
          <div class="m-auto loading" />
        </div>
      </div>

      <div class="flex">
        <div v-if="((qualifiedScores[requirement.type].data?.count || 0) / pagination[requirement.type].perPage) > 1" class="mx-auto mt-4 join outline outline-2">
          <a
            v-for="(v, i) in Math.ceil((qualifiedScores[requirement.type].data?.count || 0) / pagination[requirement.type].perPage)"
            :key="`pagination-${i}`"
            class="join-item btn btn-ghost [&.active]:outline [&.active]:bg-primary outline-2"
            :class="{
              active: pagination[requirement.type].page === i,
            }"
            type="radio"
            :aria-label="i.toString()"
            :active="pagination[requirement.type].page === v"
            @click="toPage(requirement.type, i)"
          >
            {{ v }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
