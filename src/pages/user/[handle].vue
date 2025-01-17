<script setup async lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { UserRole } from '~/def/user'
import userpageStore from '~/store/userpage'
import { useSession } from '~/store/session'
import type { Mode, Ruleset } from '~/def'
import type { LeaderboardRankingSystem } from '~/def/common'

definePageMeta({
  alias: [
    // compatible with osu stable client
    '/u/:handle',
    '/users/:handle',
  ],
})

const { t } = useI18n()
const app = useNuxtApp()
const h = useRequestURL()
const session = useSession()
const page = userpageStore()
const router = useRouter()

await page.init({
  mode: h.searchParams.has('mode') ? h.searchParams.get('mode') as Mode : undefined,
  ruleset: h.searchParams.has('ruleset') ? h.searchParams.get('ruleset') as Ruleset : undefined,
  rankingSystem: h.searchParams.has('rank') ? h.searchParams.get('rank') as LeaderboardRankingSystem : undefined,
})

const switcherState = computed(() => `${page.switcher.mode} - ${page.switcher.ruleset} - ${page.switcher.rankingSystem}`)
const userWithAppName = computed(() => `${page.user?.name} - ${app.$i18n.t('server.name')}`)
const description = computed(() => switcherState.value)

const url = () => page.user ? `${h.protocol}//${h.host}${router.resolve({ name: 'user-handle', params: { handle: page.user.id } }).fullPath}` : h.href

useSeoMeta({
  description,
  ogTitle: userWithAppName,
  ogDescription: description,
  ogImage: () => page.user?.avatarSrc,
  ogUrl: url,
  twitterTitle: userWithAppName,
  twitterDescription: description,
  twitterImage: page.user?.avatarSrc,
  twitterCard: 'summary',
})

useHead({
  titleTemplate: title => `${title} - ${app.$i18n.t('server.name')}`,
  title: () => page.user?.name || '',
  link: () => [
    { rel: 'canonical', href: url() },
  ],
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

  upcoming-dan-system: Upcoming Dan system
  dan-explain-1: This is the public test of the upcoming Dan system, inspired by well-known rhythm games such as IIDX.
  dan-explain-2: Contributed by our community, we aim to create the largest collection of Dan courses. Check our {dan-list-link} now!
  dan-list-link: available dan list
  see-dans-cleared-by-user: No dan cleared by {username} | See {count} dan cleared by {username} | See {count} dans cleared by {username}
  see-my-own-dans: See my own
  close: Close
  dismiss: Got it, don't show again

zh-CN:
  error-occurred: 抱歉
  unknown-error: 出现了一些小问题。
  back: 返回之前的页面
  retry: 重新加载
  banned: 该账号处于封禁状态。
  self-banned: 你的账号处于封禁状态。你的个人资料只能由你和{server}的工作人员查看。
  mode-no-data: Ta 还没有玩过这个模式。

  upcoming-dan-system: 即将上线段位认证系统
  dan-explain-1: 现开展段位系统的上线测试，灵感来自流行的节奏游戏，如IIDX。
  dan-explain-2: 由社区贡献，我们致力成为全网最大的段位库。现在就去{dan-list-link}看看吧！
  dan-list-link: 已添加的段位列表
  see-dans-cleared-by-user: '{username} 没有已通过的段位 | 查看 {username} 已通过的段位 | 查看 {username} 已通过的 {count} 个段位'
  see-my-own-dans: 看看自己的
  close: 关闭
  dismiss: 朕知道了，不必再提示

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
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span v-if="page.user.id === session.user?.id">{{ t('self-banned', { server: t('server.name') }) }}</span>
        <span v-else>{{ t('banned') }}</span>
      </div>
    </div>

    <userpage-heading id="heading" ref="heading" />
    <userpage-profile />

    <template v-if="page.currentStatistic?.level === 0">
      <div class="container py-20 mx-auto custom-container">
        <h1 class="text-3xl text-center text-gbase-400 dark:text-gbase-600">
          {{ t('mode-no-data') }}
        </h1>
      </div>
    </template>
    <template v-else>
      <userpage-ranking-system-switcher class="z-10" />
      <div class="container max-w-screen-lg mx-auto">
        <userpage-statistics id="statistics" ref="statistics" />
        <userpage-score-rank-composition />
      </div>
      <section v-if="page.dan.neverShow === false" v-show="page.dan.visible" class="container mx-auto max-w-screen-lg">
        <div id="alert-additional-content-1" class="p-4 mb-4 text-blue-800 border border-blue-300 rounded-xl bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800" role="alert">
          <div class="flex items-center">
            <svg class="flex-shrink-0 w-4 h-4 me-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span class="sr-only">Info</span>
            <h3 class="text-lg font-medium">
              {{ t('upcoming-dan-system') }}
            </h3>
            <button type="button" class="ms-auto -mx-1.5 -my-1.5 bg-blue-50 text-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 p-1.5 hover:bg-blue-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700" data-dismiss-target="#alert-1" aria-label="Close" @click="page.dan.visible = false">
              <span class="sr-only">{{ t('close') }}</span>
              <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
              </svg>
            </button>
          </div>
          <div class="mt-2 mb-4 text-sm">
            <p>{{ t('dan-explain-1') }}</p>
            <i18n-t tag="p" keypath="dan-explain-2">
              <template #dan-list-link>
                <nuxt-link-locale :to="{ name: 'dan-list' }" class="link">
                  {{ t('dan-list-link') }}
                </nuxt-link-locale>
              </template>
            </i18n-t>
          </div>
          <div class="flex">
            <nuxt-link-locale
              :to="{ name: 'dan-player', query: { id: page.user.id } }"
              :disabled="page.dan.count === 0"
              :class="{ 'opacity-70 pointer-events-none': page.dan.count === 0 }"
              type="button"
              class="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:outline-none focus:ring-blue-200 font-medium rounded-lg text-xs px-3 py-1.5 me-2 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 [&:disabled]:opacity-70"
            >
              <svg class="me-2 h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 14">
                <path d="M10 0C4.612 0 0 5.336 0 7c0 1.742 3.546 7 10 7 6.454 0 10-5.258 10-7 0-1.664-4.612-7-10-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
              {{ t('see-dans-cleared-by-user', { count: page.dan.count, username: page.user.name }) }}
            </nuxt-link-locale>
            <nuxt-link-locale v-if="session.userId" :to="{ name: 'dan-player', query: { id: session.userId } }" type="button" class="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:outline-none focus:ring-blue-200 font-medium rounded-lg text-xs px-3 py-1.5 me-2 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 [&:disabled]:opacity-70">
              <svg class="me-2 h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 14">
                <path d="M10 0C4.612 0 0 5.336 0 7c0 1.742 3.546 7 10 7 6.454 0 10-5.258 10-7 0-1.664-4.612-7-10-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>
              {{ t('see-my-own-dans') }}
            </nuxt-link-locale>
            <button type="button" class="text-blue-800 bg-transparent border border-blue-800 hover:bg-blue-900 hover:text-white focus:ring-4 focus:outline-none focus:ring-blue-200 font-medium rounded-lg text-xs px-3 py-1.5 text-center dark:hover:bg-blue-600 dark:border-blue-600 dark:text-blue-400 dark:hover:text-white dark:focus:ring-blue-800" data-dismiss-target="#alert-additional-content-1" aria-label="Close" @click="page.dan.neverShow = true">
              {{ t('dismiss') }}
            </button>
          </div>
        </div>
      </section>
      <template v-if="page.currentRankingSystem">
        <div id="bestScores" ref="bestScores" class="container max-w-screen-lg py-2 mx-auto">
          <userpage-best-scores />
        </div>
        <div id="topScores" ref="topScores" class="container max-w-screen-lg py-4 mx-auto">
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
  @apply z-40;
}

.up-nav-item>* {
  @apply md:basis-32
}
</style>
