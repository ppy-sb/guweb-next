<script setup async lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { UserRole } from '~/def/user'
import userpageStore from '~/store/userpage'
import { useSession } from '~/store/session'

definePageMeta({
  alias: [
    // compatible with osu stable client
    '/u/:handle',
    '/users/:handle',
  ],
})

const app = useNuxtApp()
const { t } = useI18n()
const page = userpageStore()
const h = useRequestURL()
await page.init()
const session = useSession()

const switcherState = computed(() => `${page.switcher.mode} - ${page.switcher.ruleset} - ${page.switcher.rankingSystem}`)
const userWithAppName = computed(() => `${page.user?.name} - ${app.$i18n.t('server.name')}`)
const description = computed(() => switcherState.value)

useSeoMeta({
  description,
  ogTitle: userWithAppName,
  ogDescription: description,
  ogImage: () => page.user?.avatarSrc,
  ogUrl: () => h.href,
  twitterTitle: userWithAppName,
  twitterDescription: description,
  twitterImage: page.user?.avatarSrc,
  twitterCard: 'summary',
})

useHead({
  titleTemplate: title => `${title} - ${app.$i18n.t('server.name')}`,
  title: () => page.user?.name || '',
})

const visible = reactive({
  heading: false,
  statistics: false,
  bestScores: false,
  topScores: false,
})
const icons: Record<keyof typeof visible, string> = {
  topScores: 'pajamas:first-contribution',
  bestScores: 'fa6-brands:pied-piper-pp',
  statistics: 'tabler:clipboard-data',
  heading: 'material-symbols:home-health-rounded',
}
const [handle, heading, statistics, bestScores, topScores] = [
  shallowRef<HTMLElement | null>(null),
  shallowRef<HTMLElement | null>(null),
  shallowRef<HTMLElement | null>(null),
  shallowRef<HTMLElement | null>(null),
  shallowRef<HTMLElement | null>(null),
]

onMounted(() => {
  const stop = Object.entries({
    heading,
    statistics,
    bestScores,
    topScores,
  }).map(([k, v]) => {
    if (!v.value) {
      return undefined
    }
    const { stop } = useIntersectionObserver(v, ([{ isIntersecting }]) => {
      visible[k as keyof typeof visible] = isIntersecting
    })
    return stop
  })
  onBeforeUnmount(() => {
    stop.forEach(item => item?.())
  })
})
</script>

<i18n lang="yaml">
en-GB:
  error-occurred: Oops...
  unknown-error: something went wrong.
  back: bring me back
  retry: try again
  banned: This account has been restricted.
  self-banned: Your account has been restricted. Visibility of your profile is limited to you and {server}'s staff.
  mode-no-data: Player hasn't played this mode yet.

zh-CN:
  error-occurred: 抱歉
  unknown-error: 出现了一些小问题。
  back: 返回之前的页面
  retry: 重新加载
  banned: 该账号处于封禁状态。
  self-banned: 你的账号处于封禁状态。你的个人资料只能由你和{server}的工作人员查看。
  mode-no-data: Ta 还没有玩过这个模式。

fr-FR:
  error-occurred: Oups...
  unknown-error: Une erreur est survenue.
  back: Revenir en arrière
  retry: Réessayez
  # TODO: translated by gpt.
  banned: Ce compte a été restreint.
  self-banned: Votre compte a été restreint. La visibilité de votre profil est limitée à vous-même et au personnel de {server}.
  mode-no-data: Le joueur n'a pas encore joué à ce mode.

de-DE:
  error-occurred: Oops...
  unknown-error: Es ist ein Fehler gesperrt.
  back: Zurück
  retry: Erneut versuchen
  banned: Dieses Konto wurde gesperrt.
  self-banned: Dein Konto wurde gesperrt. Die Sichtbarkeit deines Profils ist auf dich und das Personal von {server} beschränkt.
  mode-no-data: Der Spieler hat diesen Modus noch nicht gespielt.
</i18n>

<template>
  <section v-if="page.error" class="flex grow">
    <div class="flex flex-col items-center justify-center gap-3 m-auto">
      <h1 class="text-3xl">
        {{ t('error-occurred') }}
      </h1>
      <h2 v-if="page.error.message !== ''" class="text-2xl">
        {{ formatGucchoErrorWithT(t, page.error) }}
      </h2>
      <h2 v-else class="text-2xl">
        {{ t('unknown-error') }}
      </h2>
      <div class="grid grid-cols-2 gap-2">
        <t-button class="btn-shadow" variant="primary" @click="$router.back()">
          {{ t('back') }}
        </t-button>
        <t-button class="btn-shadow" variant="secondary" @click="page.refresh">
          {{ t('retry') }}
        </t-button>
      </div>
    </div>
  </section>

  <div v-else-if="page.user" ref="handle" class="flex flex-col justify-stretch">
    <div v-if="page.user.roles.includes(UserRole.Restricted)" class="container mx-auto custom-container">
      <div role="alert" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span v-if="page.user.id === session.user?.id">{{ t('self-banned', { server: t('server.name') }) }}</span>
        <span v-else>{{ t('banned') }}</span>
      </div>
    </div>

    <userpage-heading id="heading" ref="heading" />
    <userpage-profile />

    <template v-if="page.currentStatistic?.level === 0">
      <div class="container custom-container py-20 mx-auto">
        <h1 class="text-center text-3xl text-gbase-400 dark:text-gbase-600">
          {{ t('mode-no-data') }}
        </h1>
      </div>
    </template>
    <template v-else>
      <userpage-ranking-system-switcher class="z-10" />
      <div class="container mx-auto custom-container">
        <userpage-statistics id="statistics" ref="statistics" />
        <userpage-score-rank-composition />
      </div>
      <template v-if="page.currentRankingSystem">
        <div id="bestScores" ref="bestScores" class="container py-2 mx-auto custom-container">
          <userpage-best-scores />
        </div>
        <div id="topScores" ref="topScores" class="container py-4 mx-auto custom-container">
          <userpage-top-scores />
        </div>
      </template>
      <client-only>
        <teleport to="body">
          <div class="sticky btm-nav up-nav-item">
            <template v-for="(isVisible, el) of visible" :key="el">
              <a
                v-if="icons[el]" :class="{
                  active: isVisible,
                }" :href="`#${el}`"
              >
                <icon :name="icons[el]" size="2em" />
              </a>
              <a
                v-else :class="{
                  active: isVisible,
                }" :href="`#${el}`"
              >
                {{ el }}
              </a>
            </template>
          </div>
        </teleport>
      </client-only>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
.up-nav-item {
  justify-content: center;
}

.up-nav-item>* {
  @apply md:basis-32
}
</style>
