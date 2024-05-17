<script setup lang="ts">
import type { MailTokenProvider } from '$base/server'
import { Step } from '~/components/register/steps.vue'

definePageMeta({
  layout: 'centered',
})
// eslint-disable-next-line antfu/no-const-enum
const enum PageStep {
  InputEmail,
  VerifyToken,
}
// eslint-disable-next-line antfu/no-const-enum
const enum State {
  Idle,
  SendingOTP,
  VerifyingOTP,
  Succeed,
}
const app = useNuxtApp()
const { t } = useI18n()
const params = useRoute<'auth-register'>().query

const localeRoot = localeKey.root
const gLocale = localeRoot.global

const error = ref<Error>()
const step = ref(params.token ? PageStep.VerifyToken : PageStep.InputEmail)
const state = ref(State.Idle)
const email = ref<MailTokenProvider.Email>()
const otp = ref<MailTokenProvider.OTP>()
const token = ref<MailTokenProvider.Token>()

useHead({
  title: t(gLocale.register.__path__),
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
})

async function go() {
  error.value = undefined

  if (!email.value) {
    return
  }
  try {
    state.value = State.SendingOTP
    await app.$client.user.register.sendEmailCode.mutate(email.value)
    step.value = PageStep.VerifyToken
  }
  catch (e) {
    error.value = e as any
  }
  state.value = State.Idle
}
async function checkOTP() {
  if (!otp.value || !email.value) {
    return
  }
  const otpString = otp.value.toString() as MailTokenProvider.OTP

  if (otpString.length < 6) {
    return
  }

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
}
</script>

<i18n lang="yaml">
en-GB:
  have-account: Have account?
  lgtm: LGTM!
  invalid-otp: Invalid OTP

zh-CN:
  have-account: 已经有一个账号了?
  lgtm: 我觉得可以!
  invalid-otp: 验证码不正确

fr-FR:
  have-account: Vous avez déjà un compte?
  lgtm: LGTM!
  invalid-otp: Invalid OTP

de-DE:
  have-account: Haben Sie bereits ein Konto?
  lgtm: LGTM!
  invalid-otp: Falsches OTP
</i18n>

<template>
  <div class="container max-w-screen-md mx-auto">
    <h2 class="pl-3 text-2xl text-gbase-800 dark:text-gbase-50">
      {{ $t(gLocale.register.__path__) }}
    </h2>
    <div class="grid w-full grid-cols-1 gap-6 mt-8 md:grid-cols-5 md:gap-10">
      <div class="md:col-span-2 md:order-2">
        <register-steps :step="Step.VerifyEmail" />
      </div>
      <div class="p-2 md:col-span-3">
        <span v-if="error" class="text-error">
          {{ formatGucchoErrorWithT(t, error) }}
        </span>
        <form
          v-if="step === PageStep.InputEmail"
          action="#"
          method="post"
          @submit.prevent="go"
        >
          <div
            class="flex items-center gap-2 input"
            :class="{
              'input-error': error,
            }"
          >
            {{ t(gLocale.email.__path__) }}
            <input
              id="email"
              v-model="email"
              :disabled="state === State.SendingOTP"
              class="grow"
              required="true"
              :placeholder="`cookiezi@${$config.public.baseUrl}`"
              type="email"
            >
          </div>

          <div class="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
            <button
              type="button"
              class="stack-btn btn btn-secondary"
              @click="navigateTo({ name: 'auth-login' })"
            >
              <span class="reveal">{{ $t(gLocale.login.__path__) }}</span>
              <span class="surface">{{ t("have-account") }}</span>
            </button>
            <button type="submit" class="btn btn-primary">
              <span>
                {{ t(gLocale.verify.__path__) }}
              </span>
              <span
                :class="{
                  loading: state === State.SendingOTP,
                }"
              />
            </button>
          </div>
        </form>
        <form
          v-else-if="step === PageStep.VerifyToken"
          @submit.prevent="navigateTo({ name: 'auth-create-account', query: { t: token } })"
        >
          <div
            class="flex items-center gap-2 input"
            :class="{
              'input-error': error,
            }"
          >
            {{ t(gLocale.otp.__path__) }}
            <input v-model="otp" type="number" class="grow" @input="checkOTP">
          </div>
          <button v-show="state === State.Succeed" class="w-full mt-4 btn btn-primary">
            {{ t("lgtm") }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
