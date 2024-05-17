<script setup async lang="ts">
import { useElementHover } from '@vueuse/core'
import { MutualRelationship, Relationship } from '~/def'
import { UserRole, UserStatus } from '~/def/user'
import { useSession } from '~/store/session'
import userpageStore from '~/store/userpage'

const page = userpageStore()
const route = useRoute<'user-handle'>()
const { t, locale } = useI18n()
const app$ = useNuxtApp()
const session = useSession()
const changeFriendStateButton = shallowRef(null)

const { data, refresh } = await useAsyncData(async () => {
  if (!page.user) {
    return {}
  }
  const relationWithMe
    = session.loggedIn
      ? app$.$client.me.relation.query({
        target: page.user.id,
      })
      : undefined
  const friendCount = app$.$client.user.countRelations.query({
    handle: page.user.id,
    type: Relationship.Friend,
  })
  return {
    relationWithMe: await relationWithMe,
    friendCount: await friendCount,
  }
})
const { data: live, refresh: reloadLiveData } = useAsyncData(async () =>
  // eslint-disable-next-line n/prefer-global/process
  process.server
    ? null
    : page.user?.id
      ? await app$.$client.user.status.query({ id: page.user.id })
      : null,
)
const isMutualFriend = computed(
  () => data.value?.relationWithMe?.mutual?.includes(MutualRelationship.MutualFriend) || false,
)
const isFriend = computed(() =>
  data.value?.relationWithMe?.self.includes(Relationship.Friend),
)
let isFriendButtonHovered = shallowRef(false)
onBeforeMount(() => {
  isFriendButtonHovered = useElementHover(changeFriendStateButton)
})
const friendButtonContent = computed(
  () => data.value?.friendCount || t('add-as-friend'),
)
const pendingRelation = ref(false)

onMounted(() => {
  onBeforeUnmount(() => clearInterval(setInterval(reloadLiveData, 5000)))
})

async function toggleFriend() {
  pendingRelation.value = true
  if (!session.loggedIn) {
    return navigateTo({
      name: 'auth-login',
      query: {
        redirect: route.fullPath,
      },
    })
  }
  if (!page.user) {
    return
  }
  const input = { type: Relationship.Friend, target: page.user.id } as const
  if (isFriend.value) {
    await app$.$client.me.removeOneRelation.mutate(input)
  }
  else {
    await app$.$client.me.addOneRelation.mutate(input)
  }

  await refresh()
  pendingRelation.value = false
}
</script>

<i18n lang="yaml">
en-GB:
  status:
    offline: Offline, last seen at {lastSeen}
    idle: Online.
    afk: AFK
  edit: Edit
  add-as-friend: Add as friend
  supporter: Generously supported {server}!
  staff: 'Keeping {server} online'

zh-CN:
  status:
    offline: 离线, 上次在线于 {lastSeen}
    idle: 在线.
    afk: AFK
  edit: 编辑
  add-as-friend: 添加为好友
  supporter: 慷慨捐赠了{server}!
  staff: '为{server}辛苦付出'

fr-FR:
  status:
    offline: Déconnecté, dernière connection le {lastSeen}
    idle: Connecté.
    afk: AFK
  edit: Changer
  add-as-friend: Ajouter en ami(e)
  supporter: A généreusement supporté {server}!
  staff: 'Veille sur {server}'

de-DE:
  status:
    offline: Offline, zuletzt gesehen am {lastSeen}
    idle: Online.
    afk: AFK
  edit: Bearbeiten
  add-as-friend: Als Freund hinzufügen
  supporter: Hat {server} großzügig unterstützt!
  staff: 'Hält {server} online'
</i18n>

<template>
  <section
    v-if="page.user"
    class="flex flex-col items-center w-full gap-5 mx-auto mt-2 md:p-2 md:container custom-container md:flex-row md:items-end"
  >
    <!-- Logo -->
    <div class="relative">
      <div
        :style="`background-image: url(${page.user.avatarSrc}); background-position: center`"
        class="bg-cover mask mask-squircle w-44 sm:w-56 md:w-72 lg:w-64 aspect-square"
      />
      <div
        v-if="page.user.roles.includes(UserRole.Supporter)"
        class="absolute -top-10 -right-6 tooltip tooltip-primary tooltip-right"
        :data-tip="t('supporter', { server: $t('server.name') })"
      >
        <icon name="twemoji:crown" class="w-20 h-20 rotate-[40deg]" />
      </div>
      <div
        v-if="page.user.clan?.badge"
        class="absolute bottom-0 right-0 badge lg:badge-lg tooltip tooltip-primary tooltip-right"
        :data-tip="page.user.clan.name"
      >
        {{ page.user.clan.badge }}
      </div>
    </div>
    <!-- info -->
    <div class="flex flex-col w-full p-2 lg:p-0 md:p-0 bg-gbase-200 dark:bg-gbase-700 md:bg-transparent dark:md:bg-transparent md:grow">
      <div
        v-if="session.$state.userId !== page.user.id"
        class="container flex items-center justify-center order-3 gap-3 pb-2 mx-auto lg:justify-between md:order-1 md:justify-end md:pb-0"
      >
        <p class="flex flex-wrap gap-1">
          <span v-if="page.user.roles.includes(UserRole.Verified)" class="flex items-center gap-1">
            <icon name="ic:round-verified" class="w-5 h-5" />
            {{ $t(localeKey.role(UserRole.Verified)) }}
          </span>
          <span v-if="isStaff(page.user)" class="flex items-center gap-1">
            <icon name="healthicons:social-work" class="w-5 h-5" />
            {{ t('staff', { server: $t('server.name') }) }}
          </span>
        </p>
        <t-button
          ref="changeFriendStateButton" class="gap-1 btn-shadow" size="sm"
          :variant="isMutualFriend ? 'primary' : isFriend ? 'secondary' : 'gbase'" @click="toggleFriend"
        >
          <icon
            :name="isFriendButtonHovered && isFriend
              ? 'solar:heart-broken-bold'
              : 'solar:heart-bold'
            " :class="{
              'fa-bounce': isFriendButtonHovered,
            }" class="w-4" size="100%"
          />
          <span
            v-if="pendingRelation"
            class="loading-sm"
            :class="{
              loading: pendingRelation,
            }"
          />
          <span v-else>{{ friendButtonContent }}</span>
        </t-button>
        <!-- <t-button class="btn-shadow"
          v-if="session.$state.loggedIn"
          size="sm"
          variant="secondary"
          class="gap-1"
        >
          icon[name=ph:chat-circle-dots-fill]
          <span>send message</span>
        </t-button> -->
      </div>
      <div v-else class="container flex justify-around order-3 gap-3 pb-4 mx-auto md:order-1 md:justify-end md:pb-0">
        <!-- <t-button class="btn-shadow"
          size="sm"
          variant="primary"
        >
          add as friend
        </t-button> -->
        <t-nuxt-link-button
          class="btn-shadow" size="sm" variant="accent" :to="{
            name: 'me-settings',
          }"
        >
          {{ t('edit') }}
        </t-nuxt-link-button>
      </div>
      <div
        class="container flex flex-col flex-wrap gap-4 mx-auto lg:flex-row lg:gap-0 sm:order-2 md:items-end md:justify-between md:pb-2"
      >
        <div class="order-2 mx-10 sm:mx-32 md:mx-0 md:order-1 lg:order-2 md:ml-auto md:pt-4 lg:py-2">
          <app-mode-switcher :model-value="page.switcher" class="self-start" @update:model-value="page.setSwitcher" />
        </div>
        <div class="self-center order-1 md:order-2 lg:order-1 md:self-start">
          <h1 class="pb-1 username" :class="useUserRoleColor(page.user)">
            {{ page.user.name }}
          </h1>
          <nuxt-link-locale :to="{ name: 'user-handle', params: { handle: `@${page.user.safeName}` } }" class="g-link">
            @{{ page.user.safeName }}
          </nuxt-link-locale>
          <div class="lg:pb-2" />
        </div>
      </div>
      <template v-if="live">
        <div v-if="live.status === UserStatus.Offline" class="order-3 user-status">
          {{ t('status.offline', { lastSeen: live.lastSeen.toLocaleDateString(locale, { dateStyle: 'long' }) }) }}
        </div>
        <div v-else-if="live && live.beatmap" class="order-3 user-status">
          {{ UserStatus[live.status] }} {{ autoLocale(live.beatmap.beatmapset.meta).artist }} - {{
            autoLocale(live.beatmap.beatmapset.meta).title }} [{{ live.beatmap.version }}]
        </div>
        <div v-else-if="live.status === UserStatus.Idle" class="order-3 user-status">
          {{ t('status.idle') }}
        </div>
        <div v-else-if="live.status === UserStatus.Afk" class="order-3 user-status">
          {{ t('status.afk') }}
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
.user-status {
  @apply text-center text-gbase-600 dark:text-gbase-400 bg-gbase-200/50 dark:bg-gbase-700/50 px-2;
  @apply md:text-left md:rounded;
  @apply md:[margin-left:-7em] md:[padding-left:7em];
}
</style>
