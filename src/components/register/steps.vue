<script lang="ts" setup>
defineProps<{ step: number }>()
const { t } = useI18n()
</script>

<script lang='ts'>
// eslint-disable-next-line antfu/no-const-enum
export const enum Step {
  Empty,
  VerifyEmail,
  CreateAccount,
  Login,
}
</script>

<i18n lang="yaml">
en-GB:
  verify-email: Verify email
  create-account: Create account
  login-with-client: Login

zh-CN:
  verify-email: 验证邮箱
  create-account: 创建账号
  login-with-client: 登录游戏

# TODO fr translation
fr-FR:
  verify-email: Verify email
  create-account: Create account
  login-with-client: Login

de-DE:
  verify-email: Email Verifizieren
  create-account: Account erstellen
  login-with-client: Einloggen
</i18n>

<template>
  <ul class="steps md:steps-vertical w-full overflow-y-auto">
    <li
      class="step"
      :class="{
        'step-primary': step > 0,
      }"
    >
      {{ t("verify-email") }}
    </li>
    <li
      class="step"
      :class="{
        'step-primary': step > 1,
      }"
    >
      {{ t("create-account") }}
    </li>
    <li
      class="step"
      :class="{
        'step-primary': step > 2,
      }"
    >
      {{ t("login-with-client") }}
    </li>
  </ul>
</template>
