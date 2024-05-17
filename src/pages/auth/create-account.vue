<script setup lang="ts">
import md5 from 'md5'
import type { TRPCClientError } from '@trpc/client'
import { Feature } from '~/def/features'
import type { AppRouter } from '~/server/trpc/routers'
import { useSession } from '~/store/session'
import { features } from '$active'

import { Step } from '~/components/register/steps.vue'

definePageMeta({
  layout: 'centered',
})

// eslint-disable-next-line antfu/no-const-enum
const enum State {
  Idle,
  Posting,
}

interface Shape {
  name: string
  safeName?: string
  // email: string
  password: string
}
const shape: Shape = {
  name: '',
  // email: '',
  password: '',
}

const app = useNuxtApp()
const session = useSession()

const { t } = useI18n()

const route = useRoute<'auth-create-account'>()

const localeRoot = localeKey.root
const gLocale = localeRoot.global

const { query } = route

if (!query.t) {
  await navigateTo({
    name: 'auth-register',
  })
}

const emailToken = (query.t as string)?.toString() ?? ''

const reg = shallowReactive({ ...shape })
const error = shallowReactive({ ...shape })
const unknownError = ref<Error>()
const state = ref<State>(State.Idle)

function unique(key: keyof Shape) {
  return async () => {
    const content = reg[key]

    if (content === undefined) {
      error[key] = t('key-required', { key })
      return false
    }
    const exists = await app.$client.user.uniqueIdent.query(content)
    if (!exists) {
      return true
    }
    error[key] = t('key-taken', { key })
    return false
  }
}
const pwPatternStr = '(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}'
const pwPattern = new RegExp(pwPatternStr)

const safeNamePatternStr = '[a-z0-9][a-z0-9_]+[a-z0-9]'
const safeNamePattern = new RegExp(safeNamePatternStr)

const validate: {
  [Key in keyof Shape]: () => boolean | Promise<boolean>
} = {
  name: unique('name'),
  safeName: async () =>
    features.has(Feature.StableUsername)
      ? !!reg.safeName?.match(safeNamePattern) && (await unique('safeName')())
      : true,
  // email: unique('email'),
  password() {
    return !!reg.password.match(pwPattern)
  },
}

useHead({
  title: () => `${app.$i18n.t(gLocale.register.__path__)}`,
  titleTemplate: title => `${title} - ${app.$i18n.t(gLocale.register.__path__)}`,
})

async function userRegisterAction() {
  state.value = State.Posting
  const result = (
    await Promise.all(Object.values(validate).map(test => test()))
  ).every(Boolean)
  if (!result) {
    state.value = State.Idle
    return
  }

  type E = TRPCClientError<AppRouter['user']['register']>

  const result$ = await app.$client.user.register.createAccount
    .mutate({
      name: reg.name,
      safeName: reg.safeName,
      // email: reg.email,
      emailToken,
      passwordMd5: md5(reg.password),
    })
    .catch((ex: E) => {
      const e = ex.data?.zodError?.fieldErrors
      if (e) {
        for (const f in e) {
          switch (f) {
            case 'name': {
              error.name = e[f]?.join(', ') || ''
              break
            }
            // case 'email': {
            //   error.email = e[f]?.join(', ') || ''
            //   break
            // }
            case 'passwordMd5': {
              error.password = e[f]?.join(', ') || ''
              break
            }
          }
        }
      }
      else {
        unknownError.value = ex
      }
    })
  state.value = State.Idle
  if (result$) {
    const session = useSession()
    await session.retrieve()
    navigateTo('/article/registered')
  }
}
</script>

<i18n lang="yaml">
en-GB:
  key-required: '{key} must not be empty'
  key-taken: '{key} is already taken.'
  name: Nickname (you can change it later)
  name-pattern: Must not includes uppercase letter, nor starts or ends with _, contains only number, a-z and _
  link: Username
  password-pattern: Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters

zh-CN:
  key-required: '{key} 不能为空'
  key-taken: '{key} 已经被占用了'
  name: 用户昵称(可以随时修改)
  name-pattern: 不包含大写字母,不能以 _ 作为开头和结尾,即只能包含 数字、小写字母a-z 以及 下划线 _
  link: 用户名
  password-pattern: 必须包含至少一个数字、一个大写字母和一个小写字母,并且密码长度至少为8。

fr-FR:
  key-required: '{key} ne peut pas être vide.'
  key-taken: '{key} n''est pas disponible.'
  name: Pseudo (vous pourrez le changer plus tard)
  name-pattern: Ne doit pas contenir de lettre majuscule, ni commencer ou se terminer par _, doit contenir uniquement des chiffres, a-z et _
  link: Nom d'utilisateur
  password-pattern: Doit contenir au moins un chiffre et une lettre majuscule et minuscule, et au moins 8 caractères.

deDE:
  key-required: '{key} darf nicht leer sein.'
  key-taken: '{key} ist bereits vergeben.'
  name: Benutzername (kann später geändert werden)
  name-pattern: Darf keine Großbuchstaben enthalten, darf nicht mit _ beginnen oder enden, enthält nur Zahlen, a-z und _
  link: Benutzername
  password-pattern: Muss mindestens eine Zahl und einen Groß- und Kleinbuchstaben enthalten und mindestens 8 oder mehr Zeichen lang sein.
</i18n>

<template>
  <div class="container max-w-screen-md mx-auto">
    <h2 class="pl-3 text-2xl text-gbase-800 dark:text-gbase-50">
      {{ $t(gLocale.register.__path__) }}
    </h2>
    <div class="grid w-full grid-cols-1 gap-6 mt-8 md:grid-cols-5 md:gap-10">
      <div class="md:col-span-2 md:order-2">
        <register-steps :step="Step.CreateAccount" />
      </div>
      <div class="p-2 md:col-span-3">
        <fetch-overlay :fetching="state === State.Posting" />
        <div v-if="session.loggedIn" class="my-2 alert alert-warning">
          You are logged in as {{ session.user?.name }}
        </div>
        <form
          class="space-y-4"
          autocomplete="off"
          @submit.prevent="userRegisterAction"
        >
          <div class="space-y-2">
            <div v-if="unknownError" class="text-error">
              {{ formatGucchoErrorWithT(t, unknownError) }}
            </div>
            <div>
              <label for="name" class="sr-only">{{ t("name") }}</label>
              <input
                id="nickname"
                v-model="reg.name"
                name="nickname"
                type="name"
                autocomplete="off"
                required
                class="w-full shadow-sm input input-shadow input-ghost"
                :class="{ 'input-error': error.name }"
                :placeholder="t('name')"
                @input="error.name = ''"
              >
              <div class="pl-4 text-sm text-error">
                {{ error.name }}
              </div>
            </div>
            <template v-if="features.has(Feature.StableUsername)">
              <div>
                <label for="name" class="sr-only">{{ t("link") }}</label>
                <input
                  id="name"
                  v-model="reg.safeName"
                  name="name"
                  type="name"
                  autocomplete="off"
                  required
                  :pattern="safeNamePatternStr"
                  :title="t('name-pattern')"
                  class="w-full shadow-sm input input-shadow input-ghost"
                  :class="{ 'input-error': error.safeName }"
                  :placeholder="t('link')"
                  @input="error.safeName = ''"
                >
                <div class="pl-4 text-sm text-error">
                  {{ error.safeName }}
                </div>
              </div>
            </template>
            <!-- <div>
            <label for="name" class="sr-only">{{ t('email') }}</label>
            <input
              id="email"
              v-model="reg.email"
              name="email"
              type="email"
              autocomplete="off"
              required
              class="w-full shadow-sm input input-shadow input-ghost"
              :class="{ 'input-error': error.email }"
              :placeholder="t('email')"
              @input="error.email = ''"
            >
            <div class="pl-4 text-sm text-error">
              {{ error.email }}
            </div>
          </div> -->
            <div>
              <label for="password" class="sr-only">{{ t(gLocale.password.__path__) }}</label>
              <input
                id="password"
                v-model="reg.password"
                name="password"
                type="password"
                autocomplete="off"
                required
                :pattern="pwPatternStr"
                :title="t('password-pattern')"
                class="w-full shadow-sm input input-shadow input-ghost"
                :class="{ 'input-error': error.password }"
                :placeholder="t(gLocale.password.__path__)"
                @input="error.password = ''"
              >
              <div class="pl-4 text-sm text-error">
                {{ error.password }}
              </div>
            </div>
          </div>
          <button type="submit" class="w-full btn btn-shadow btn-primary">
            {{ $t(gLocale.register.__path__) }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.auth-error-text {
  @apply text-red-500 text-sm font-medium
}

.half-box {
  @apply relative w-full max-w-md p-6
  /* &::before {
    content: ""
    @apply absolute left-0 top-0 right-0 bottom-0
    @apply bg-gradient-to-t from-gbase-500/5 to-transparent rounded-3xl
    @apply blur-sm -z-10
  } */
}
</style>
