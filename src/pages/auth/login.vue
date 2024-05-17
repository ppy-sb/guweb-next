<script setup lang="ts">
import type { TRPCError } from '@trpc/server'
import { formatGucchoErrorWithT } from '../../common/utils'
import { useSession } from '~/store/session'

const session = useSession()
const router = useRouter()
if (session.loggedIn) {
  router.back()
}
const localeRoot = localeKey.root
const lGlobal = localeRoot.global

definePageMeta({
  layout: 'centered',
})

const route = useRoute<'auth-login'>()
const app = useNuxtApp()
const { t } = useI18n()

const error = shallowRef('')

const login = shallowReactive<{
  user: string
  password: string
  persist: boolean
}>({
  user: '',
  password: '',
  persist: false,
})

const fetching = shallowRef(false)

useHead({
  title: () => `${app.$i18n.t(lGlobal.login.__path__)}`,
  titleTemplate: title => `${title} - ${app.$i18n.t(localeRoot.server.name.__path__)}`,
})

async function userLogin() {
  fetching.value = true
  error.value = ''
  try {
    const result = await session.login(login.user, login.password, { persist: login.persist })
    if (result) {
      if (route.query.redirect) {
        await navigateTo(route.query.redirect.toString())
      }
      else if (route.query.back === '1') {
        router.back()
      }
      else {
        await navigateTo('/')
      }
    }
  }
  catch (_error) {
    error.value = formatGucchoErrorWithT(t, (_error as TRPCError))
  }
  finally {
    fetching.value = false
  }
}
</script>

<i18n lang="yaml">
en-GB:
  have-no-account: Don't have an account?
  user-or-email: User / Email
  user-id-email: User / ID / Email
  forgot-password: forgor password?
  persist-login: Remember me

zh-CN:
  have-no-account: 没有账号?
  user-or-email: 用户名 / 邮箱
  user-id-email: 用户名 / ID / 邮箱
  forgot-password: 密码忘了？
  persist-login: 保持登录状态

# TODO fr translation
fr-FR:
  have-no-account: Vous n'avez pas de compte?
  user-or-email: Utilisateur / Email
  user-id-email: Utilisateur / ID / Email
  password: Mot de passe
  persist-login: Se souvenir de moi

de-DE:
  have-no-account: Sie haben kein Konto?
  user-or-email: Nutzername / E-Mail
  user-id-email: Nutzername / ID / E-Mail
  password: Passwort
  persist-login: Passwort speichern
</i18n>

<template>
  <div class="flex flex-col w-full">
    <div class="mx-auto half-box">
      <fetch-overlay :fetching="fetching" />
      <div>
        <h2 class="pl-2 text-2xl text-gbase-800 dark:text-gbase-50">
          {{ $t(lGlobal.login.__path__) }}
        </h2>
      </div>
      <form class="mt-8 space-y-4" autocomplete="off" method="post" action="#" @submit.prevent="userLogin">
        <div class="form-control">
          <label for="user" class="sr-only">{{ t('user-or-email') }}</label>
          <input
            id="user" v-model="login.user" name="user" type="user" autocomplete="off" required
            class="w-full shadow-sm input" :class="{ 'input-error': error }"
            :placeholder="t('user-id-email')"
          >
        </div>
        <div class="form-control">
          <label for="password" class="sr-only">{{ t(lGlobal.password.__path__) }}</label>
          <input
            id="password" v-model="login.password" name="password" type="password" autocomplete="off" required
            class="w-full shadow-sm input input-shadow" :class="{ 'input-error': error }"
            :placeholder="t(lGlobal.password.__path__)"
          >
        </div>
        <div class="form-control">
          <nuxt-link-locale
            class="m-1 link link-info" @click.prevent="navigateTo({
              name: 'auth-account-recovery',
            })"
          >
            {{ t('forgot-password') }}
          </nuxt-link-locale>
        </div>

        <div class="form-control">
          <label class="cursor-pointer label">
            <span class="label-text">{{ t('persist-login') }}</span>
            <input v-model="login.persist" type="checkbox" class="toggle">
          </label>
        </div>
        <h1 v-if="error" class="auth-error-text">
          {{ error }}
        </h1>
        <div class="grid grid-cols-2 gap-2">
          <t-nuxt-link-button
            class="btn-shadow stack-btn" to="/auth/register" variant="accent"
          >
            <span class="surface">{{ t('have-no-account') }}</span>
            <span class="reveal">{{ $t(lGlobal.register.__path__) }}</span>
          </t-nuxt-link-button>
          <button type="submit" class="btn btn-shadow btn-primary">
            {{ $t(lGlobal.login.__path__) }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.auth-error-text {
  @apply text-red-500 text-sm font-medium;
}

.half-box {
  @apply relative w-full max-w-md p-6 overflow-hidden space-y-8 rounded-3xl;
}
</style>
