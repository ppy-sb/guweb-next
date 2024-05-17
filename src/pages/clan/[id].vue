<script lang="ts" async setup>
import { useSession } from '~/store/session'
import { CountryCode } from '~/def/country-code'
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem } from '~/def/common'
import { ClanRelation } from '~/def/clan'
import { GucchoError } from '~/def/messages'

const fmt = createNumberFormatter()

const session = useSession()
const { locale } = useI18n()
const app = useNuxtApp()
const config = useRuntimeConfig()
const { supportedModes, supportedRulesets } = useAdapterConfig()
const { t } = useI18n()

const availableRankingSystems = Object.keys(config.public.leaderboardRankingSystem)
const route = useRoute('clan-id')
const { id } = route.params
const { mode: pMode, ruleset: pRuleset, ranking: pRankingSystem } = route.query
const mode = (
  (isString(pMode) && includes(pMode, supportedModes))
    ? pMode
    : supportedModes[0]
) as ActiveMode

const ruleset = (
  (isString(pRuleset) && includes(pRuleset, supportedRulesets))
    ? pRuleset
    : supportedRulesets[0]
) as ActiveRuleset

const rankingSystem = (
  (isString(pRankingSystem) && availableRankingSystems.includes(pRankingSystem))
    ? pRankingSystem
    : availableRankingSystems[0]
) as LeaderboardRankingSystem

const selected = ref<Required<SwitcherPropType<LeaderboardRankingSystem>>>({
  mode,
  ruleset,
  rankingSystem,
})

const mergeQuery = computed(() => ({ ...selected.value, id }))
const { data: clan, refresh: refreshClan, error } = await app.$client.clan.detail.useQuery(mergeQuery)
const relation = ref(
  session.loggedIn
    ? clan.value
      ? await app.$client.clan.relation.query({ id: clan.value.id })
      : ClanRelation.JoinedOtherClan
    : null
)

const usersQuery = reactive<{ page: number; perPage: number }>({ page: 0, perPage: 20 })
const { data: players, pending: pendingUsers, refresh: refreshUsers } = app.$client.clan.joinedUsers.useQuery(computed(() => ({ ...usersQuery, id })))

const bestsQuery = reactive<{ page: number; perPage: number }>({ page: 0, perPage: 10 })
const _v = computed(() => ({ ...bestsQuery, ...selected.value, id }))
const { data: bests, pending: pendingBests, refresh: refreshBP } = useAsyncData('best', async () => {
  return {
    res: await app.$client.clan.bests.query(_v.value),
    ...selected.value,
  }
}, { watch: [_v] })

const allowToJoin = [
  ClanRelation.Free,
  ClanRelation.Left,
  ClanRelation.QuitPendingVerification,
]
const allowToLeave = [
  ClanRelation.Member,
  ClanRelation.JoinPendingVerification,
]

useHead({
  title: t(localeKey.title.clans.__path__),
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
})

async function requestJoin() {
  if (!clan.value) {
    return
  }
  relation.value = await app.$client.clan.join.mutate({ id: clan.value.id })
  await refresh()
}
async function requestLeave() {
  if (!clan.value) {
    return
  }
  relation.value = await app.$client.clan.leave.mutate({ id: clan.value.id })
  await refresh()
}

function refresh() {
  return Promise.all([refreshClan(), refreshBP(), refreshUsers()])
}
</script>

<i18n lang="yaml">
en-GB:
  owner: Owner
  created-at: Created at
  member: Member
  members: Members
  clan-best-scores: Best scores

zh-CN:
  owner: 家长
  created-at: 创立于
  member: 组员
  members: 组员
  clan-best-scores: 最好成绩

de-DE:
  owner: Besitzer
  created-at: Erstellt am
  member: Mitglied
  members: Mitglieder
  clan-best-scores: Beste Ergebnisse
</i18n>

<template>
  <section class="container mx-auto custom-container !max-w-5xl">
    <div v-if="!clan || error" class="mt-10">
      <template v-if="error">
        <div class="text-xl font-light">
          {{ error.data?.code }}
        </div>
        <div class="text-3xl font-bold">
          {{ formatGucchoErrorWithT(t, error) }}
        </div>
        <dev-only>
          <pre class="whitespace-pre-wrap">{{ (error.data! as any).stack || error.message }}</pre>
        </dev-only>
      </template>
      <template v-else>
        <div class="text-3xl font-bold">
          {{ formatGucchoErrorCodeWithT(t, GucchoError.ClanNotFound) }}
        </div>
      </template>
    </div>
    <template v-else>
      <div class="px-2 lg:px-0">
        <div class="flex flex-col items-center gap-8 md:flex-row">
          <div class="relative drop-shadow-md">
            <img :alt="clan.name" :src="clan.avatarSrc" class="object-cover w-48 h-auto mask mask-squircle">
            <span class="absolute bottom-0 right-0 font-semibold badge badge-lg md:badge-xl">
              {{ clan.badge }}
            </span>
          </div>
          <div class="flex flex-col w-full md:self-end md:flex-row grow">
            <span class="self-center text-3xl md:text-4xl md:self-end">{{ clan.name }}</span>
            <div class="md:ms-auto flex gap-2 items-end">
              <template v-if="session.loggedIn">
                <button v-if="includes(relation, allowToJoin)" class="mx-auto md:ms-auto md:me-0 btn btn-primary btn-circle" @click="requestJoin">
                  <icon name="material-symbols:group-add-outline-rounded" class="w-5 h-5" />
                </button>
                <button v-else-if="includes(relation, allowToLeave)" class="mx-auto md:ms-auto md:me-0 btn btn-primary btn-circle" @click="requestLeave">
                  <icon name="material-symbols:group-remove-outline-rounded" class="w-5 h-5" />
                </button>
              </template>
              <dl class="rounded-lg overflow-clip">
                <div class="striped">
                  <dt class="py-1 text-sm font-medium text-gbase-500">
                    {{ t('owner') }}
                  </dt>
                  <dd class="striped-text">
                    <nuxt-link-locale :to="{ name: 'user-handle', params: { handle: clan.owner.safeName } }" class="flex items-center gap-1">
                      <div class="w-8 h-8 mask mask-squircle">
                        <img :src="clan.owner.avatarSrc" alt="avatar">
                      </div>
                      <span class="font-bold whitespace-nowrap" :class="useUserRoleColor(clan.owner)">{{ clan.owner.name }}</span>
                    </nuxt-link-locale>
                  </dd>
                </div>
                <div class="striped">
                  <dt class="text-sm font-medium text-gbase-500">
                    {{ t('created-at') }}
                  </dt>
                  <dd class="flex items-center gap-1 striped-text">
                    {{ clan.createdAt.toLocaleString(locale) }}
                  </dd>
                </div>
                <div class="striped">
                  <dt class="text-sm font-medium text-gbase-500">
                    {{ t('member') }}
                  </dt>
                  <dd class="flex items-center gap-1 striped-text">
                    {{ fmt(clan.countUser) }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div class="pt-6 pb-2 text-3xl font-semibold md:pt-8">
        {{ t('members') }}
      </div>
      <div class="relative overflow-x-auto border rounded-lg bg-base-100 border-base-300">
        <table
          description="users"
          class="table table-sm table-zebra"
        >
          <thead>
            <tr>
              <th>{{ t('user') }}</th>
            </tr>
          </thead>
          <tbody
            class="transition-opacity origin-center transition-filter"
            :class="{
              'opacity-30 saturate-50 blur-md': pendingUsers,
            }"
          >
            <tr v-for="user in players?.[1]" :key="user.id">
              <td>
                <div class="flex items-center space-x-3">
                  <div class="avatar">
                    <div class="w-12 h-12 mask mask-squircle">
                      <img :src="user.avatarSrc" alt="avatar">
                    </div>
                  </div>
                  <div>
                    <nuxt-link-locale
                      class="font-bold whitespace-nowrap"
                      :to="{ name: 'user-handle', params: { handle: `@${user.safeName}` } }"
                    >
                      {{ user.name }}
                    </nuxt-link-locale>
                    <div class="text-sm opacity-50 whitespace-nowrap">
                      {{ $t(localeKey.country(user.flag || CountryCode.Unknown)) }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm" :class="{
            'opacity-100 !blur-none': pendingUsers,
          }"
        >
          <div class="m-auto loading loading-lg" />
        </div>
      </div>
      <div v-if="Math.ceil((players?.[0] ?? 0) / usersQuery.perPage) > 1" class="flex pt-4">
        <div class="mx-auto join">
          <template v-for="(i, n) in Math.ceil((players?.[0] ?? 0) / usersQuery.perPage)" :key="`sw${i}`">
            <button
              v-if="n === 0" class="join-item btn"
              :class="{
                'btn-active': n === usersQuery.page,
              }"
              @click="(usersQuery.page = n)"
            >
              {{ Math.abs(n - usersQuery.page) > 3 && '|&lt;' || '' }} {{ i }}
            </button>
            <button
              v-else-if="Math.abs(n - usersQuery.page) <= 3"
              class="join-item btn"
              :class="{
                'btn-active': n === usersQuery.page,
              }"
              @click="(usersQuery.page = n)"
            >
              {{ i }}
            </button>
            <button
              v-else-if="i === Math.ceil((players?.[0] ?? 0) / usersQuery.perPage)" class="join-item btn"
              :class="{
                'btn-active': n === usersQuery.page,
              }"
              @click="(usersQuery.page = n)"
            >
              {{ i }} &gt;|
            </button>
          </template>
        </div>
      </div>
      <div class="divider" />
      <div class="md:flex">
        <app-mode-switcher
          v-model="selected"
          :show-sort="true"
          class="md:ms-auto md:order-2"
        />
        <div class="pt-6 pb-2 text-3xl font-semibold md:pt-8 md:order-1">
          {{ t('clan-best-scores') }}
        </div>
      </div>

      <div class="relative" :class="[pendingBests && 'pointer-events-none']">
        <div
          v-if="bests?.res[1]?.length"
          class="transition-[filter] transition-opacity duration-200 relative" :class="{
            'saturate-50 opacity-30': pendingBests,
          }"
        >
          <ul>
            <li v-for="i in bests.res[1]" :key="`bests-${i.score.id}`" class="score">
              <div>
                <img :src="i.user.avatarSrc" :alt="i.user.name" class="inline object-cover w-5 h-5 align-middle mask mask-squircle">
                <span class="inline font-semibold align-middle ps-1" :class="useUserRoleColor(i.user)">{{ i.user.name }}</span>
              </div>
              <app-score-list-item :score="i.score" :mode="bests.mode" :ruleset="bests.ruleset" :ranking-system="bests.rankingSystem" />
            </li>
          </ul>
        </div>
        <div
          class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm" :class="{
            'opacity-100 !blur-none': pendingBests,
          }"
        >
          <div class="m-auto loading loading-lg" />
        </div>
      </div>
      <div class="flex pt-4">
        <div class="mx-auto join">
          <template v-for="(i, n) in Math.ceil((bests?.res[0] ?? 0) / bestsQuery.perPage)" :key="`sw${i}`">
            <button
              v-if="n === 0" class="join-item btn"
              :class="{
                'btn-active': n === bestsQuery.page,
              }"
              @click="(bestsQuery.page = n)"
            >
              {{ Math.abs(n - bestsQuery.page) > 3 && '|&lt;' || '' }} {{ i }}
            </button>
            <button
              v-else-if="Math.abs(n - bestsQuery.page) <= 3"
              class="join-item btn"
              :class="{
                'btn-active': n === bestsQuery.page,
              }"
              @click="(bestsQuery.page = n)"
            >
              {{ i }}
            </button>
            <button
              v-else-if="i === Math.ceil((bests?.res[0] ?? 0) / bestsQuery.perPage)" class="join-item btn"
              :class="{
                'btn-active': n === bestsQuery.page,
              }"
              @click="(bestsQuery.page = n)"
            >
              {{ i }} &gt;|
            </button>
          </template>
        </div>
      </div>
    </template>
  </section>
</template>
