<script setup lang="ts">
import type { UserCompact } from '~/def/user'
import type { UserRelationship } from '~/def/user-relationship'
import { MutualRelationship, Relationship } from '~/def'
import { useSession } from '~/store/session'

const app$ = useNuxtApp()
const session = useSession()

if (!session.$state.loggedIn) {
  await navigateTo({
    name: 'auth-login',
    query: {
      back: '1',
    },
  })
}

const {
  data: relations,
  refresh: refreshRelations,
} = await app$.$client.me.relations.useQuery()
const {
  data: haveUserAsTheirFriend,
  refresh: refreshHaveUserAsTheirFriend,
} = await app$.$client.me.notMutual.useQuery()

const { t } = useI18n()

if (!relations.value) {
  throw new Error(t('user-not-found'))
}

const errorMessage = shallowRef('')
const pendingUser = reactive(new Set<string>())

onErrorCaptured((err) => {
  errorMessage.value = formatGucchoErrorWithT(t, err) || t('err-message')
})

useHead({
  titleTemplate: title => `${title} - ${app$.$i18n.t(localeKey.server.name.__path__)}`,
  title: () => `${app$.$i18n.t(localeKey.root.title.relations.__path__)}`,
})

function haveRelation(relation: Relationship, user: UserCompact<string> & UserRelationship) {
  return user.relationship.includes(relation)
}

async function toggleRelation(type: Relationship, user: UserCompact<string> & UserRelationship) {
  pendingUser.add(user.id)
  try {
    if (haveRelation(type, user)) {
      await removeOneAs(type, user)
      user.relationship = user.relationship.filter(k => k !== type)
    }
    else {
      await addOneAs(type, user)
      user.relationship.push(type)
    }
    pendingUser.delete(user.id)
    refreshHaveUserAsTheirFriend()
  }
  catch (e) {
    pendingUser.delete(user.id)
  }
}

async function addOneAs(type: Relationship, user: { id: string }) {
  await app$.$client.me.addOneRelation.mutate({ type, target: user.id })
}
async function removeOneAs(type: Relationship, user: { id: string }) {
  await app$.$client.me.removeOneRelation.mutate({ type, target: user.id })
}

async function addAsMutual(type: Relationship, user: { id: string }) {
  pendingUser.add(user.id)
  await addOneAs(Relationship.Friend, user)
  await Promise.all([refreshRelations(), refreshHaveUserAsTheirFriend()])
  pendingUser.delete(user.id)
}

const toggleFriend = toggleRelation.bind(null, Relationship.Friend)
const isFriend = haveRelation.bind(null, Relationship.Friend)
// const toggleBlock = toggleRelation.bind(null, 'block')
// const isBlocked = haveRelation.bind(null, 'block')
</script>

<i18n lang="yaml">
en-GB:
  loading: Loading...
  err-message: Something went wrong.
  user-not-found: User does not exist.
  mutual-friends: Mutual friends
  remove-friend: Breakup
  regret: Regret
  you-may-also-wonder: You may also wonder...
  not-mutual-friends: These people have added you as their friend.
  mutual: Mutual

zh-CN:
  loading: 加载中...
  err-message: 出现了一些问题。
  user-not-found: 用户不存在。
  remove-friend: 删除好友
  regret: 后悔了。。
  you-may-also-wonder: 你可能也会好奇...
  not-mutual-friends: 这些人已将你添加为好友。
  mutual: 互粉

fr-FR:
  loading: Chargement...
  err-message: Une erreur est survenue.
  user-not-found: Utilisateur inexistant.
  remove-friend: Retirer l'ami
  regret: Regret
  you-may-also-wonder: Vous pourriez également vous demander...
  not-mutual-friends: Ces personnes vous ont ajouté en tant qu'ami.
  mutual: Mutuel

de-DE:
  loading: Lade...
  err-message: Etwas ist schief gelaufen.
  user-not-found: Nutzer existiert nicht.
  remove-friend: Entfernen
  regret: Vergeben
  you-may-also-wonder: Du könntest dich auch fragen...
  not-mutual-friends: Diese Personen haben dich als Freund hinzugefügt.
  mutual: Mutual
</i18n>

<template>
  <div class="container pt-24 mx-auto custom-container">
    <suspense>
      <template #fallback>
        <div>
          {{ errorMessage || t('loading') }}
        </div>
      </template>
      <div>
        <div class="mx-auto user-list">
          <div v-for="user in relations" :key="`relation-@${user.safeName}`" class="w-full p-2 user-list-item">
            <div class="flex items-center justify-center gap-2 md:justify-start">
              <div class="relative z-10 mask mask-squircle hoverable">
                <img :alt="user.name" :src="user.avatarSrc" class="pointer-events-none w-14 md:w-[4em]">
              </div>
              <div class="grow">
                <h1 class="text-2xl">
                  {{ user.name }} <div v-if="user.mutualRelationship.some(r => r === MutualRelationship.MutualFriend)" class="badge badge-primary">
                    <icon name="solar:heart-bold" class="w-4 h-4" />
                  </div>
                </h1>
                <div class="flex justify-between w-full items-top">
                  <nuxt-link-locale
                    :key="`${user.id}:${user.relationship.join('-')}`"
                    class="text-lg text-left md:text-xl g-link-style hover:text-gbase-500"
                    :to="{
                      name: 'user-handle',
                      params: {
                        handle: `@${user.safeName}`,
                      },
                    }"
                  >
                    @{{ user.safeName }}
                  </nuxt-link-locale>
                  <div class="flex gap-2">
                    <!-- <t-button class="btn-shadow" variant="info" size="xs" class="md:btn-sm">
                      chat
                    </t-button> -->

                    <button class="btn btn-shadow btn-xs md:btn-sm" :class="isFriend(user) ? 'btn-warning' : 'btn-primary'" @click="toggleFriend(user)">
                      <template v-if="pendingUser.has(user.id)" />
                      <template v-else-if="isFriend(user)">
                        {{ t('remove-friend') }}
                        <icon name="solar:heart-broken-bold" class="w-4 h-4" />
                      </template>
                      <template v-else>
                        {{ t('regret') }}
                        <icon name="solar:heart-bold" class="w-4 h-4" />
                      </template>
                      <span v-if="pendingUser.has(user.id)" class="loading loading-spinner loading-xs md:loading-md" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="haveUserAsTheirFriend?.length" class="py-8 text-xl divider">
          {{ t('you-may-also-wonder') }}
        </div>

        <template v-if="haveUserAsTheirFriend?.length">
          <div class="p-2 lg:p-0">
            <div class="alert">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 stroke-current shrink-0">
                <path
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{{ t('not-mutual-friends') }}</span>
            </div>
          </div>
          <div class="mx-auto user-list">
            <div
              v-for="user in haveUserAsTheirFriend" :key="`relation-@${user.safeName}`"
              class="w-full p-2 user-list-item"
            >
              <div class="flex items-center justify-center gap-2 md:justify-start face">
                <div class="relative z-10 mask mask-squircle hoverable">
                  <img :alt="user.name" :src="user.avatarSrc" class="pointer-events-none w-14 md:w-[4em]">
                </div>
                <div class="grow">
                  <h1 class="text-2xl text-left md:text-3xl">
                    {{ user.name }}
                  </h1>
                  <div class="flex justify-between w-full items-top">
                    <nuxt-link-locale
                      :key="`${user.id}:notMutual`"
                      class="text-lg text-left md:text-2xl g-link-style"
                      :to="{
                        name: 'user-handle',
                        params: {
                          handle: `@${user.safeName}`,
                        },
                      }"
                    >
                      @{{ user.safeName }}
                    </nuxt-link-locale>
                    <div class="flex gap-2">
                      <button class="btn btn-shadow btn-xs md:btn-sm btn-primary" @click="addAsMutual(Relationship.Friend, user)">
                        {{ t('mutual') }}
                        <span v-if="pendingUser.has(user.id)" class="loading loading-spinner loading-xs md:loading-md" />
                        <icon v-else name="solar:heart-bold" class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </suspense>
  </div>
</template>

<style lang="scss">
.user-list {
  .user-list-item {
    @apply border-b-2 border-gbase-500/30;
  }

  @apply grid lg:grid-cols-2 gap-x-8;
}
</style>
