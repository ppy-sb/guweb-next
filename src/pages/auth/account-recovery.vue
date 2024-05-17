<script lang="ts" setup>
import md5 from 'md5'
import { GucchoError } from '~/def/messages'
import type { MailTokenProvider } from '$base/server'
import { useSession } from '~/store/session'

definePageMeta({
  layout: 'centered',
})

// eslint-disable-next-line antfu/no-const-enum
const enum State {
  Errored,
  Idle,
  Posting,
  Succeed,
}

// eslint-disable-next-line antfu/no-const-enum
const enum Step {
  Handle,
  OTP,
  NewPassword,
  Succeed,
}

const app = useNuxtApp()
const session = useSession()
const { t } = useI18n()
const route = useRoute()

const localeRoot = localeKey.root
const gLocale = localeRoot.global

if (session.loggedIn) {
  await navigateTo({
    name: 'me-settings',
  })
}

const token = ref<MailTokenProvider.Token>(route.query.t?.toString() as any)

const state = ref(State.Idle)
const step = ref(token.value ? Step.NewPassword : Step.Handle)

const error = ref<Error>()
const email = ref<MailTokenProvider.Email>(route.query.email?.toString() || '' as any)
const otp = ref<MailTokenProvider.OTP>('' as any)
const password = ref('')
const repeatPassword = ref('')

useHead({
  title: () => t(localeKey.title['account-recovery'].__path__),
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
})

async function step1() {
  state.value = State.Posting
  try {
    await app.$client.user.accountRecovery.otp.mutate(email.value)
    state.value = State.Idle
    step.value = Step.OTP
    error.value = undefined
  }
  catch (e: any) {
    _handleError(e)
  }
}

async function step2() {
  if (!otp.value || !email.value) {
    return
  }

  const otpString = otp.value

  if (otpString.length < 6) {
    return
  }

  try {
    const result = await app.$client.mail.getToken.query({
      otp: otpString,
      email: email.value,
    })

    if (!result) {
      error.value = {
        name: Error.name,
        message: t('invalid-otp'),
      }
      return
    }
    token.value = result.token
    state.value = State.Succeed
    step.value = Step.NewPassword
    error.value = undefined
  }
  catch (e) {
    _handleError(e)
  }
}

async function step3() {
  if (!password.value.length) {
    return
  }
  if (password.value !== repeatPassword.value) {
    error.value = {
      name: '',
      message: fromGucchoErrorCode(GucchoError.OldPasswordMismatch),
    }
    return
  }
  try {
    state.value = State.Posting
    await app.$client.user.accountRecovery.changePassword.mutate({
      password: md5(password.value),
      repeatPassword: md5(repeatPassword.value),
      token: {
        email: email.value,
        otp: otp.value,
        token: token.value,
      },
    })
    state.value = State.Idle
    step.value = Step.Succeed
  }
  catch (e) {
    _handleError(e)
  }
}

function _handleError(e: any) {
  state.value = State.Errored
  error.value = e
}
</script>

<i18n lang="yaml">
en-GB:
  next: Next
  invalid-otp: Invalid OTP
  repeat-password: Repeat password
  done: Done
  succeed-message: Done!

zh-CN:
  next: 下一步
  invalid-otp: 验证码不正确
  repeat-password: 确认密码
  done: 完成
  succeed-message: 密码重置成功！

# TODO fr translation
fr-FR:
  invalid-otp: Invalid OTP

de-DE:
  next: Weiter
  invalid-otp: Falsches OTP
  repeat-password: Passwort wiederholen
  done: Fertig
</i18n>

<template>
  <div class="container max-w-screen-sm mx-auto">
    <h1 class="mb-8 text-3xl">
      {{ t(localeRoot.title['account-recovery'].__path__) }}
    </h1>
    <form
      v-if="step === Step.Handle"
      action="#"
      method="post"
      class="flex flex-col"
      @submit.prevent="step1"
    >
      <div
        class="flex items-center gap-2 input"
        :class="{
          'input-error': error,
        }"
      >
        <span>{{ t(gLocale.email.__path__) }}</span>
        <input
          v-model="email"
          class="grow"
          required="true"
          type="email"
        >
      </div>
      <span v-if="error" class="m-2 text-error">{{ formatGucchoErrorWithT(t, error) }}</span>
      <button class="mt-2 min-w-32 btn btn-primary ms-auto">
        {{ t('next') }}
        <span v-if="state === State.Posting" class="loading" />
        <icon v-else name="material-symbols:arrow-right-alt-rounded" class="w-5 h-5" />
      </button>
    </form>
    <form
      v-else-if="step === Step.OTP"
      class="flex flex-col space-y-4"
      @submit.prevent="step2"
    >
      <div
        class="flex items-center gap-2 input"
        :class="{
          'input-error': error,
        }"
      >
        <span>{{ t(gLocale.otp.__path__) }}</span>
        <input v-model="otp" class="grow">
      </div>
      <span v-if="error" class="m-2 text-error">{{ formatGucchoErrorWithT(t, error) }}</span>
      <button class="mt-4 min-w-32 ms-auto btn btn-primary">
        {{ t("next") }}
        <span v-if="state === State.Posting" class="loading" />
        <icon v-else name="material-symbols:arrow-right-alt-rounded" class="w-5 h-5" />
      </button>
    </form>
    <form
      v-else-if="step === Step.NewPassword"
      class="flex flex-col space-y-4"
      @submit.prevent="step3"
    >
      <div
        class="flex items-center gap-2 input"
        :class="{
          'input-error': error,
        }"
      >
        <span>{{ t(gLocale.password.__path__) }}</span>
        <input
          v-model="password"
          type="password"
          class="grow"
        >
      </div>
      <div
        class="flex items-center gap-2 input"
        :class="{
          'input-error': error,
        }"
      >
        <span>{{ t('repeat-password') }}</span>
        <input
          v-model="repeatPassword"
          type="password"
          class="grow"
        >
      </div>
      <span v-if="error" class="m-2 text-error">{{ formatGucchoErrorWithT(t, error) }}</span>
      <button class="mt-4 min-w-32 ms-auto btn btn-primary">
        {{ t("done") }}
        <span v-if="state === State.Posting" class="loading" />
        <icon v-else name="material-symbols:arrow-right-alt-rounded" class="w-5 h-5" />
      </button>
    </form>
    <div v-if="step === Step.Succeed" class="space-y-4">
      <div class="text-2xl">
        {{ t("succeed-message") }}
      </div>
      <nuxt-link-locale
        class="btn btn-primary"
        :to="{
          name: 'auth-login',
        }"
      >
        {{ t(localeKey.root.global.login.__path__) }}
        <icon name="material-symbols:arrow-right-alt-rounded" class="w-5 h-5" />
      </nuxt-link-locale>
    </div>
  </div>
</template>
