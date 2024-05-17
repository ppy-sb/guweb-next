<script setup lang="ts">
import md5 from 'md5'
import { Cropper } from 'vue-advanced-cropper'
import { type ContentEditor, TResponsiveModal } from '#components'
import type { MailTokenProvider } from '$base/server'
import type { ArticleProvider } from '$base/server/article'
import 'vue-advanced-cropper/dist/style.css'
import { CountryCode } from '~/def/country-code'
import { Client, OS } from '~/def/device'
import { useSession } from '~/store/session'

// eslint-disable-next-line antfu/no-const-enum
const enum UpdateUserSettingsState {
  Errored,
  Idle,
  Posting,
  Succeed,
}

// eslint-disable-next-line antfu/no-const-enum
const enum UploadingAvatarState {
  Errored,
  Idle,
  Uploading,
  Succeed,
}

// eslint-disable-next-line antfu/no-const-enum
const enum ChangeEmailState {
  Errored,
  Idle,
  Posting,
  Succeed,
}

// eslint-disable-next-line antfu/no-const-enum
const enum ChangeEmailStep {
  InputEmail,
  InputOTP,
}

// eslint-disable-next-line antfu/no-const-enum
const enum ChangePasswordState {
  Error,
  Idle,
  Posting,
  Succeed,
}

// @ts-expect-error I'll use it later
// eslint-disable-next-line antfu/no-const-enum, unused-imports/no-unused-vars
const enum ProfileState {
  Errored,
  Idle,
  Edited,
  Posting,
  Succeed,
}

const app$ = useNuxtApp()
const route = useRoute<'me-settings'>()
const { t, locale } = useI18n()
const session = useSession()
const dyn = await useDynamicSettings()

definePageMeta({
  middleware: ['auth'],
  alias: ['/home/account/edit'],
})

useHead({
  title: () => t(localeKey.title.settings.__path__),
  titleTemplate: title => `${title} - ${app$.$i18n.t(localeKey.server.name.__path__)}`,
})

const {
  data: user,
  refresh: refreshSettings,
} = await useAsyncData(() => app$.$client.me.settings.query())

const {
  data: sessions,
  refresh: refreshSession,
  pending: pendingSession,
} = await app$.$client.me.sessions.useQuery()

if (!user.value) {
  await navigateTo({
    name: 'auth-login',
    query: {
      redirect: route.fullPath,
    },
  })
}

const unchanged = shallowRef({
  ...(user.value as Exclude<(typeof user)['value'], null>),
})

const profile = shallowRef<ArticleProvider.JSONContent>()
const profileEdited = shallowRef(false)
const editor = shallowRef<InstanceType<typeof ContentEditor>>()

const newAvatar = shallowRef<File>()
const newAvatarURL = shallowRef<string>()
const cropper = shallowRef<InstanceType<typeof Cropper> | null>(null)
const croppedAvatar = shallowRef<ArrayBuffer>()
const avatarError = shallowRef<string>()

if (user.value?.profile) {
  const pf = user.value.profile
  if (pf.raw) {
    profile.value = pf.raw
  }
}
let changeEmailTimeout: NodeJS.Timeout | undefined

const updateUserSettingsState = shallowRef(UpdateUserSettingsState.Idle)
const uploadingAvatarState = shallowRef(UploadingAvatarState.Idle)
const changePasswordState = shallowRef(ChangePasswordState.Idle)
const changeEmailState = ref<[ChangeEmailStep, ChangeEmailState]>([ChangeEmailStep.InputEmail, ChangeEmailState.Idle])

const changePasswordForm = shallowReactive<{
  oldPassword?: string
  newPassword?: string
  repeatNewPassword?: string
}>({
  oldPassword: undefined,
  newPassword: undefined,
  repeatNewPassword: undefined,
})

const errorMessage = shallowRef<string[]>([])
const changePasswordError = shallowRef('')

const changeEmailError = shallowRef('')
const otp = shallowRef('')

const changeAvatar = shallowRef<InstanceType<typeof TResponsiveModal>>()
const changePassword = shallowRef<InstanceType<typeof TResponsiveModal>>()
const changeEmail = shallowRef<InstanceType<typeof TResponsiveModal>>()

onMounted(() => {
  route.hash === '#avatar' && changeAvatar.value?.showModal()
})

async function saveAvatar() {
  if (!croppedAvatar.value) {
    return
  }

  uploadingAvatarState.value = UploadingAvatarState.Uploading

  const url = await app$.$client.me.changeAvatar.mutate({
    avatar: new Uint8Array(croppedAvatar.value),
  })

  uploadingAvatarState.value = UploadingAvatarState.Succeed
  newAvatarURL.value = url
  session.setAvatarTimestamp()
  await refreshSettings()
  editor.value?.reload()
}
async function updateUserSettings() {
  dyn.save()
  if (!user.value) {
    return
  }
  errorMessage.value = []
  const updateData = {
    name:
      user.value.name !== unchanged.value.name ? user.value.name : undefined,
    // email:
    //   user.value.email !== unchanged.value.email ? user.value.email : undefined,
    flag:
      user.value.flag !== unchanged.value.flag ? user.value.flag : undefined,
    preferredMode: user.value.preferredMode,
  }

  updateUserSettingsState.value = UpdateUserSettingsState.Posting

  const [result, profileResult] = await Promise.all([
    app$.$client.me.changeSettings.mutate(updateData)
      .catch((error) => {
        if (!error.data.zodError) {
          errorMessage.value.push(formatGucchoErrorWithT(t, error))
        }
        else {
          for (const key in error.data.zodError.fieldErrors) {
            const v: string[] = error.data.zodError.fieldErrors[key]
            errorMessage.value.push(`${key}: ${v.join(';')}`)
          }
        }
        updateUserSettingsState.value = UpdateUserSettingsState.Errored
        return UpdateUserSettingsState.Errored as const
      }),

    profile.value
      && profileEdited.value
      && app$.$client.me.changeUserpage
        .mutate({ profile: profile.value })
        .catch((error) => {
          errorMessage.value.push(formatGucchoErrorWithT(t, error))
          updateUserSettingsState.value = UpdateUserSettingsState.Errored
          return UpdateUserSettingsState.Errored as const
        }),
  ])

  if (result === UpdateUserSettingsState.Errored || profileResult === UpdateUserSettingsState.Errored) {
    return
  }

  updateUserSettingsState.value = UpdateUserSettingsState.Succeed
  setTimeout(() => {
    updateUserSettingsState.value = UpdateUserSettingsState.Idle
  }, 3000)

  if (result) {
    unchanged.value = { ...unchanged.value, ...result }
    user.value = { ...unchanged.value }

    session.user = {
      ...session.user,
      ...result,
    }
  }
  if (profileResult) {
    profile.value = profileResult.raw
  }
}

async function selectAvatarFile(e: Event) {
  avatarError.value = undefined
  const file = (e?.target as HTMLInputElement)?.files?.[0]
  if (!file) {
    return
  }

  if (!checkAvatar(await file.arrayBuffer())) {
    avatarError.value = t('avatar.size-too-big')
    return
  }

  newAvatar.value = file
  newAvatarURL.value = URL.createObjectURL(file)
}

function crop({ canvas }: { canvas: HTMLCanvasElement }) {
  canvas.toBlob(
    async (blob) => {
      croppedAvatar.value = await blob?.arrayBuffer()
    },
    'image/png',
    1
  )
}

async function updatePassword(closeModal: () => void) {
  changePasswordState.value = ChangePasswordState.Error

  if (!changePasswordForm.newPassword) {
    changePasswordState.value = ChangePasswordState.Idle
    return
  }

  if (changePasswordForm.newPassword !== changePasswordForm.repeatNewPassword) {
    changePasswordError.value = t('password.new-password-mismatch')
    return
  }

  if (changePasswordForm.oldPassword === changePasswordForm.newPassword) {
    changePasswordError.value = t('password.same-password-as-old')
    return
  }

  changePasswordState.value = ChangePasswordState.Posting

  const md5HashedPassword = {
    newPassword: md5(changePasswordForm.newPassword),
    oldPassword: md5(changePasswordForm.oldPassword ?? ''),
  }

  try {
    changePasswordState.value = ChangePasswordState.Posting
    const result = await app$.$client.me.updatePassword.mutate(
      md5HashedPassword
    )
    unchanged.value = {
      ...unchanged.value,
      ...result,
    }
    closeModal()
    changePasswordState.value = ChangePasswordState.Idle
  }
  catch (error: any) {
    changePasswordError.value = formatGucchoErrorWithT(t, error)
  }
}

function resetAvatar() {
  newAvatar.value = undefined
  newAvatarURL.value = undefined
  uploadingAvatarState.value = UploadingAvatarState.Idle
}

async function kickSession(session: string) {
  await app$.$client.me.kickSession.mutate({ session })
  refreshSession()
}

async function setNewEmail(closeModal: CallableFunction) {
  clearTimeout(changeEmailTimeout)
  changeEmailState.value = [ChangeEmailStep.InputEmail, ChangeEmailState.Posting]
  try {
    const result = await app$.$client.me.changeEmail.validateEmail.mutate(user.value!.email as MailTokenProvider.Email)
    changeEmailError.value = ''
    switch (result) {
      case 'otp': {
        changeEmailState.value = [ChangeEmailStep.InputOTP, ChangeEmailState.Idle]
        break
      }
      case 'succeed': {
        changeEmailState.value = [ChangeEmailStep.InputEmail, ChangeEmailState.Succeed]
        changeEmailTimeout = setTimeout(() => {
          changeEmailState.value = [ChangeEmailStep.InputEmail, ChangeEmailState.Idle]
          closeModal()
        }, 3000)
      }
    }
  }
  catch (e) {
    changeEmailError.value = formatGucchoErrorWithT(t, e as Error)
    changeEmailState.value = [ChangeEmailStep.InputEmail, ChangeEmailState.Errored]
  }
}

async function validateOTPAndChangeEmail(closeModal: CallableFunction) {
  clearTimeout(changeEmailTimeout)
  changeEmailState.value = [ChangeEmailStep.InputOTP, ChangeEmailState.Posting]
  try {
    const result = await app$.$client.me.changeEmail.changeWithToken.mutate({
      email: user.value!.email as MailTokenProvider.Email,
      otp: otp.value as MailTokenProvider.OTP,
    })

    unchanged.value = {
      ...unchanged.value,
      ...result,
    }
    user.value = {
      ...user.value!,
      ...result,
    }
    changeEmailError.value = ''
    changeEmailState.value = [ChangeEmailStep.InputOTP, ChangeEmailState.Succeed]
    changeEmailTimeout = setTimeout(() => {
      changeEmailState.value = [ChangeEmailStep.InputEmail, ChangeEmailState.Idle]
      closeModal()
    }, 3000)
  }
  catch (e) {
    changeEmailError.value = formatGucchoErrorWithT(t, e as Error)
    changeEmailState.value = [ChangeEmailStep.InputOTP, ChangeEmailState.Errored]
  }
}

function updateMemo(_session: { memo?: string }) {
  // TODO update session memo
}
</script>

<i18n lang="yaml">
en-GB:
  reset: revert

  preferences: Preferences
  username: Username
  safe-name: Link
  email: Email
  flag: Flag
  profile: Profile
  default-mode: Default mode

  status:
    done: Done!
    ready: Save

  avatar:
    change: change
    size-too-big: size too big
    upload:
      click-to-upload: click-to-upload
      placement: '{bold} or drag and drop'
      bold: Click to upload
    status:
      ready: Save
      uploading: Uploading
      done: Done
      abort: Cancel

  password:
    change: change
    literal: Password
    new-password-mismatch: new password not match.
    same-password-as-old: same password.
    old-password: Old Password
    new-password: New Password
    repeat-password: Repeat Password
    ok: confirm
    abort: cancel

  api-key:
    literal: API Key
    placeholder: Your API Key
    request: Request one
    refresh: Request a new one

  session:
    device: Device
    last-activity: Last seen at
    actions: Action
    current: You
    kick: Kick

  change-email:
    otp: One time code

zh-CN:
  reset: 恢复

  preferences: 设置
  username: 用户名
  safe-name: 引用连接
  email: 电子邮箱
  flag: 国家或地区
  profile: 个人简介
  default-mode: 主页默认模式

  status:
    done: 完成
    ready: 保存

  avatar:
    change: 更换头像
    size-too-big: 图片大小过大,请控制在2MB以内
    upload:
      click-to-upload: 点击此处上传
      placement: '{bold} 或将图片拖入此处'
      bold: 上传
    status:
      ready: 保存
      uploading: 上传中
      done: 完成
      abort: 取消

  password:
    change: 修改
    literal: 修改密码
    new-password-mismatch: 两次输入的密码不一致
    same-password-as-old: 新密码和旧密码一致
    old-password: 旧密码
    new-password: 新密码
    repeat-password: 确认密码
    ok: 确认
    abort: 取消

  api-key:
    literal: API 秘钥
    placeholder: 你的API 秘钥
    request: 请求一个
    refresh: 重置你的API秘钥

  session:
    name: 设备
    last-activity: 上次活跃时间
    actions: 操作
    current: 当前
    kick: 强制登出

fr-FR:
  reset: Réinitialiser

  preferences: Préférences
  username: Nom d'utilisateur
  safe-name: Lien
  email: Email
  flag: Drapeau
  profile: Profil
  default-mode: Mode par défaut

  status:
    done: Terminé!
    ready: Sauvegarder

  avatar:
    change: Modifier
    size-too-big: Fichier trop volumineux
    upload:
      click-to-upload: Cliquer pour téléverser
      placement: '{bold} ou glisser-déposer'
      bold: Cliquer pour téléverser
    status:
      ready: Sauvegarder
      uploading: Téléversement
      done: Terminé
      abort: Annuler

  password:
    change: Modifier
    literal: Mot de passe
    new-password-mismatch: Nouveau mot de passe différent
    same-password-as-old: Mot de passe identique
    old-password: Ancien mot de passe
    new-password: Nouveau mot de passe
    repeat-password: Confirmer mot de passe
    ok: Confirmer
    abort: Annuler

  api-key:
    literal: Clé API
    placeholder: Votre clé API
    request: Demander une
    refresh: Demander une nouvelle

  session:
    device: Appareil
    last-activity: Vu pour la dernière fois
    actions: Action
    current: vous
    kick: Exclure

de-DE:
  reset: Zurücksetzen

  preferences: Einstellungen
  username: Benutzername
  safe-name: Link
  email: E-Mail
  flag: Flagge
  profile: Profil
  default-mode: Standardmodus

  status:
    done: Fertig!
    ready: Speichern

  avatar:
    change: Ändern
    size-too-big: Datei zu groß
    upload:
      click-to-upload: Klicken zum Hochladen
      placement: '{bold} oder Datei hierhin ziehen'
      bold: Hochladen
    status:
      ready: Speichern
      uploading: Hochladen
      done: Fertig
      abort: Abbrechen

  password:
    change: Ändern
    literal: Passwort
    new-password-mismatch: Neues Passwort stimmt nicht überein
    same-password-as-old: Neues Passwort ist identisch
    old-password: Altes Passwort
    new-password: Neues Passwort
    repeat-password: Passwort wiederholen
    ok: Bestätigen
    abort: Abbrechen

  api-key:
    literal: API-Schlüssel
    placeholder: Ihr API-Schlüssel
    request: Anfordern
    refresh: Neuen anfordern

  session:
    device: Gerät
    last-activity: Zuletzt gesehen
    actions: Aktionen
    current: Du
    kick: Abmelden
</i18n>

<template>
  <section v-if="user" class="container mx-auto custom-container">
    <TResponsiveModal
      ref="changeAvatar"
      v-slot="{ closeModal }"
      class="my-auto"
    >
      <div
        class="p-4 space-x-2 shadow-xl rounded-xl bg-gbase-50 dark:bg-gbase-700"
      >
        <div class="flex items-center justify-center w-full">
          <label v-if="!newAvatar" for="dropzone-file" class="dropzone">
            <div
              class="flex flex-col items-center justify-center px-3 pt-5 pb-6"
            >
              <svg
                aria-hidden="true"
                class="w-10 h-10 mb-3 text-gbase-600 dark:text-gbase-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>

              <i18n-t
                keypath="avatar.upload.placement"
                tag="p"
                class="mb-2 text-sm text-gbase-500 dark:text-gbase-300"
              >
                <template #bold>
                  <span class="font-semibold">{{
                    t("avatar.upload.click-to-upload")
                  }}</span>
                </template>
              </i18n-t>

              <!-- <p class="text-xs text-gbase-500 dark:text-gbase-300">
                SVG, PNG, JPG or GIF (MAX. 800x400px)
              </p> -->
              <p class="text-sm text-red-500">
                {{ avatarError }}
              </p>
            </div>
            <input
              id="dropzone-file"
              accept="image/*"
              type="file"
              class="hidden"
              @change="selectAvatarFile"
            >
          </label>
          <output
            v-else-if="uploadingAvatarState !== UploadingAvatarState.Succeed"
            class="m-2 drop-shadow w-96"
          >
            <Cropper
              ref="cropper"
              class="cropper"
              :src="newAvatarURL"
              :stencil-props="{
                aspectRatio: 1,
              }"
              :canvas="{
                minHeight: 64,
                minWidth: 64,
                maxHeight: 640,
                maxWidth: 640,
              }"
              @change="crop"
            />
          </output>
          <img
            v-else
            :src="newAvatarURL"
            class="w-56 h-56 overflow-hidden mask mask-squircle _avatar"
          >
        </div>
        <t-button
          v-if="
            uploadingAvatarState !== UploadingAvatarState.Succeed && newAvatar
          "
          class="btn-shadow grow"
          :loading="uploadingAvatarState === UploadingAvatarState.Uploading"
          @click="saveAvatar"
        >
          {{
            uploadingAvatarState === UploadingAvatarState.Idle
              ? t("avatar.status.ready")
              : t("avatar.status.uploading")
          }}
        </t-button>
        <t-button
          class="btn-shadow grow"
          :variant="
            uploadingAvatarState === UploadingAvatarState.Succeed
              ? 'success'
              : 'gbase'
          "
          @click="closeModal(resetAvatar)"
        >
          {{
            uploadingAvatarState === UploadingAvatarState.Succeed
              ? t("avatar.status.done")
              : t("avatar.status.abort")
          }}
        </t-button>
      </div>
    </TResponsiveModal>

    <TResponsiveModal ref="changePassword" v-slot="{ closeModal }" class="my-auto">
      <div class="shadow-lg card bg-base-100">
        <form action="#" @submit.prevent="updatePassword(closeModal)">
          <div class="card-body w-96">
            <div class="form-control">
              <label class="label" for="old-password">
                <span class="pl-2 label-text">{{
                  t("password.old-password")
                }}</span>
              </label>
              <input
                id="old-password"
                v-model="changePasswordForm.oldPassword"
                type="password"
                class="input input-shadow input-sm input-bordered"
                required
              >
            </div>
            <div class="form-control">
              <label class="label" for="new-password">
                <span class="pl-2 label-text">{{
                  t("password.new-password")
                }}</span>
              </label>
              <input
                id="new-password"
                v-model="changePasswordForm.newPassword"
                type="password"
                class="input input-shadow input-sm input-bordered"
                required
              >
            </div>
            <div class="form-control">
              <label class="label" for="repeat-password">
                <span class="pl-2 label-text">{{
                  t("password.repeat-password")
                }}</span>
              </label>
              <input
                id="repeat-password"
                v-model="changePasswordForm.repeatNewPassword"
                type="password"
                class="input input-shadow input-sm input-bordered"
                required
              >
            </div>
            <span class="px-2 text-error">{{ changePasswordError }}</span>
          </div>
          <div class="flex gap-2 p-4">
            <t-button class="btn-shadow grow" size="sm" variant="accent">
              <span v-if="changePasswordState === ChangePasswordState.Posting" class="loading loading-sm" />
              <icon v-else name="ic:round-check" class="w-5 h-5" size="100%" />
              {{ t("password.ok") }}
            </t-button>
            <t-button
              class="btn-shadow grow"
              size="sm"
              variant="secondary"
              type="button"
              @click="
                closeModal(() => {
                  changePasswordForm = {};
                  changePasswordError = '';
                })
              "
            >
              <icon name="ic:round-clear" class="w-5 h-5" size="100%" />
              {{ t("password.abort") }}
            </t-button>
          </div>
        </form>
      </div>
    </TResponsiveModal>

    <TResponsiveModal ref="changeEmail" v-slot="{ closeModal }" class="my-auto">
      <div class="shadow-lg card bg-base-100">
        <form v-if="changeEmailState[0] === ChangeEmailStep.InputEmail" action="#" @submit.prevent="setNewEmail(closeModal)">
          <div class="card-body w-96">
            <div class="form-control">
              <label class="label" for="new-email">
                <span class="pl-2 label-text">{{
                  t("email")
                }}</span>
              </label>
              <input
                id="new-email"
                v-model="user.email"
                type="email"
                class="input input-bordered input-shadow input-sm"
                required
              >
            </div>

            <span class="px-2 text-error">{{ changeEmailError }}</span>
          </div>
          <div class="flex gap-2 p-4">
            <t-button class="transition-colors btn-shadow grow" size="sm" variant="accent" :disabled="user.email === unchanged.email">
              <span v-if="changeEmailState[1] === ChangeEmailState.Posting" class="loading loading-sm" />
              <icon v-else name="ic:round-check" class="w-5 h-5" size="100%" />
              {{ t("password.ok") }}
            </t-button>
            <t-button
              class="btn-shadow grow"
              size="sm"
              variant="secondary"
              type="button"
              @click="
                closeModal(() => {
                  user!.email = unchanged.email
                })
              "
            >
              <icon name="ic:round-clear" class="w-5 h-5" size="100%" />
              {{ t("password.abort") }}
            </t-button>
          </div>
        </form>
        <form v-else-if="changeEmailState[0] === ChangeEmailStep.InputOTP" action="#" @submit.prevent="validateOTPAndChangeEmail(closeModal)">
          <div class="card-body w-96">
            <div class="form-control">
              <label class="label" for="otp">
                <span class="pl-2 label-text">{{
                  t("change-email.otp")
                }}</span>
              </label>
              <input
                id="otp"
                v-model="otp"
                class="input input-bordered input-shadow input-sm"
                required
              >
            </div>

            <span class="px-2 text-error">{{ changeEmailError }}</span>
          </div>
          <div class="flex gap-2 p-4">
            <t-button class="btn-shadow grow" size="sm" :variant="changeEmailState[1] === ChangeEmailState.Succeed ? 'success' : 'accent'">
              <span v-if="changeEmailState[1] === ChangeEmailState.Posting" class="loading loading-sm" />
              <icon v-else name="ic:round-check" class="w-5 h-5" size="100%" />
              {{ t("password.ok") }}
            </t-button>
            <t-button
              class="btn-shadow grow"
              size="sm"
              variant="secondary"
              type="button"
              @click="
                closeModal(() => {
                  user!.email = unchanged.email
                  otp = ''
                  changeEmailState = [ChangeEmailStep.InputEmail, ChangeEmailState.Idle]
                })
              "
            >
              <icon name="ic:round-clear" class="w-5 h-5" size="100%" />
              {{ t("password.abort") }}
            </t-button>
          </div>
        </form>
      </div>
    </TResponsiveModal>
    <div class="flex items-end justify-between p-2">
      <div class="text-3xl font-bold">
        {{ t("preferences") }}
      </div>
      <button
        class="btn btn-shadow btn-sm"
        :class="{
          'btn-accent': updateUserSettingsState !== UpdateUserSettingsState.Succeed,
          'btn-success': updateUserSettingsState === UpdateUserSettingsState.Succeed,
        }"
        type="button"
        @click="updateUserSettings"
      >
        <span v-if="updateUserSettingsState === UpdateUserSettingsState.Posting" class="loading" />
        <icon
          v-else
          :name="
            updateUserSettingsState === UpdateUserSettingsState.Succeed
              ? 'line-md:confirm'
              : 'ic:round-save'
          "
          class="w-5 h-5 me-1"
          size="100%"
        />
        {{ updateUserSettingsState === UpdateUserSettingsState.Succeed ? t("status.done") : t("status.ready") }}
      </button>
    </div>

    <div class="flex flex-col flex-wrap justify-between md:flex-row">
      <div class="grow w-full lg:[max-width:50%]">
        <div class="flex flex-wrap items-end gap-4 p-3 overflow-hidden lg:mr-4">
          <div class="drop-shadow-md">
            <div
              class="relative z-10 mask mask-squircle hoverable w-100 self-center [&>img]:hover:blur-lg [&>img]:hover:opacity-50 no-animation"
            >
              <button
                class="absolute top-0 z-20 w-full h-full btn btn-primary hover:bg-primary/50 focus:active:bg-primary/50"
                type="button"
                @click="() => changeAvatar?.showModal()"
              >
                <icon name="ic:round-edit-note" class="w-5 h-5" size="100%" />
                <span>{{ t("avatar.change") }}</span>
              </button>
              <img
                :src="newAvatarURL || `${user.avatarSrc}`"
                class="w-40 h-40 pointer-events-none _avatar"
              >
            </div>
          </div>
          <div>
            <h1 class="username">
              {{ user.name }}
            </h1>
            <h2 class="g-link">
              @{{ user.safeName }}
            </h2>
            <div class="pb-4" />
          </div>
        </div>
        <div class="lg:mr-4">
          <label class="label" for="session">
            <span class="pl-3 label-text">{{ $t("global.session") }}</span>
          </label>
          <div id="session" class="relative">
            <div class="overflow-x-auto">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ t("session.device") }}</th>
                    <th>{{ t("session.last-activity") }}</th>
                    <th>{{ t("session.actions") }}</th>
                  </tr>
                </thead>
                <tbody
                  class="transition-opacity origin-center transition-filter"
                  :class="{
                    'opacity-30 saturate-50 blur-md': pendingSession,
                  }"
                >
                  <!-- eslint-disable-next-line vue/no-template-shadow -->
                  <tr v-for="(session, id) of sessions" :key="id">
                    <td>
                      <div class="flex items-center space-x-3">
                        <div class="avatar">
                          <div class="mask mask-squircle">
                            <icon
                              v-if="session.OS === OS.Unknown"
                              name="carbon:unknown"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.Windows"
                              name="basil:windows-solid"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.macOS"
                              name="ic:baseline-apple"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.iPadOS"
                              name="ic:baseline-apple"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.iOS"
                              name="wpf:iphone"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.Android"
                              name="mingcute:android-2-fill"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.ChromeOS"
                              name="ri:chrome-fill"
                              class="w-9 h-9"
                            />
                            <icon
                              v-else-if="session.OS === OS.Linux"
                              name="fluent-mdl2:linux-logo-32"
                              class="w-9 h-9"
                            />
                          </div>
                        </div>
                        <div>
                          <div class="font-bold whitespace-nowrap">
                            {{ OS[session.OS] }}
                            <span
                              v-if="session.current"
                              class="badge badge-ghost badge-sm whitespace-nowrap"
                            >{{ t("session.current") }}</span>
                          </div>

                          <div v-if="session.client === Client.Browser" class="text-xs opacity-50">
                            {{ session.browser }}
                          </div>

                          <input v-model="session.memo" class="p-0 m-0 text-sm bg-transparent border-b text-base-content/50 input-ghost" disabled @focusout="() => updateMemo(session)">
                        </div>
                      </div>
                    </td>
                    <td>
                      {{ formatTimeAgo(session.lastSeen, locale) }}
                    </td>
                    <th scope="row">
                      <button
                        class="inline btn btn-ghost btn-xs whitespace-nowrap"
                        :disabled="pendingSession || session.current"
                        @click="kickSession(id)"
                      >
                        {{ t("session.kick") }}
                        <icon
                          name="majesticons:logout-half-circle-line"
                          class="w-5 h-5 me-1"
                          size="100%"
                        />
                      </button>
                    </th>
                  </tr>
                </tbody>
              </table>
              <div
                class="absolute inset-0 flex transition-opacity opacity-0 pointer-events-none transition-filter blur-sm"
                :class="{
                  'opacity-100 !blur-none': pendingSession,
                }"
              >
                <div class="m-auto loading loading-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="grow lg:[max-width:50%] mt-4 lg:mt-0 lg:pl-4 pr-2 lg:mr-0">
        <div class="text-red-500">
          {{ errorMessage.join(",") }}
        </div>
        <div class="form-control">
          <label class="label" for="username">
            <span class="pl-3 label-text">{{ t("username") }}</span>
          </label>
          <div
            class="join"
            :class="
              unchanged.name !== user.name && 'input-group input-group-sm'
            "
          >
            <input
              id="username"
              v-model="user.name"
              type="text"
              :placeholder="t('username')"
              class="join-item grow input input-shadow input-sm"
              :disabled="!user.changeable.name"
              :class="{
                'input-bordered input-primary': unchanged.name !== user.name,
              }"
            >
            <button
              v-if="unchanged.name !== user.name"
              class="join-item btn btn-shadow btn-sm"
              type="button"
              :disabled="unchanged.name === user.name"
              @click="
                () => {
                  if (!user || !unchanged) return;
                  user.name = unchanged.name;
                }
              "
            >
              {{ t("reset") }}
            </button>
          </div>
        </div>
        <div>
          <label class="label" for="g-link">
            <span class="pl-3 label-text">{{ t("safe-name") }}</span>
          </label>
          <div class="space-x-4">
            <input
              id="g-link"
              v-model="user.safeName"
              type="text"
              class="w-full input input-shadow input-sm grow"
              disabled
              :class="{
                'input-bordered input-primary':
                  unchanged.safeName !== user.safeName,
              }"
            >
            <!-- <button class="btn btn-shadow btn-sm btn-secondary" type="button" disabled>
              request change
            </button> -->
          </div>
        </div>
        <div class="form-control">
          <label class="label" for="email">
            <span class="pl-3 label-text">{{ t("email") }}</span>
          </label>
          <div
            class="join"
          >
            <!-- :disabled="!user.changeable.email" -->
            <input
              id="email"
              v-model="user.email"
              type="email"
              disabled
              class="join-item grow input input-shadow input-sm"
            >

            <button
              id="#email"
              class="join-item btn btn-shadow btn-sm btn-secondary"
              type="button"
              @click.prevent="() => changeEmail?.showModal()"
            >
              <icon name="ic:round-edit-note" class="w-5 h-5" size="100%" />
              {{ t("password.change") }}
            </button>
          </div>
        </div>
        <div class="form-control">
          <label class="label" for="flag">
            <span class="pl-3 label-text">{{ t("flag") }}</span>
          </label>
          <div class="flex gap-2 pl-3">
            <img :src="getFlagURL(user.flag)" class="w-6" alt="flag">
            <select v-model="user.flag" class="w-full select select-sm" :disabled="!user.changeable.flag">
              <option
                v-for="countryCode in CountryCode"
                :key="countryCode"
                :disabled="countryCode === user.flag || countryCode === CountryCode.Unknown"
                :selected="countryCode === user.flag"
                :value="countryCode"
              >
                <template v-if="countryCode === CountryCode.Unknown">
                  ❓
                </template>
                <template v-else-if="countryCode === user.flag">
                  ➖
                </template>
                <template v-else>
                  {{ getFlagEmoji(countryCode) }}
                </template>
                {{ $t(localeKey.country(countryCode)) }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-control">
          <label class="label" for="default-mode">
            <span class="pl-3 label-text">{{ t("default-mode") }}</span>
          </label>
          <app-mode-switcher
            v-model="user.preferredMode"
            class="w-1/2 mx-auto min-w-min"
          />
        </div>
        <div>
          <label class="label" for="password">
            <span class="pl-3 label-text">{{ t("password.literal") }}</span>
            <button
              id="#password"
              class="btn btn-shadow btn-sm btn-secondary"
              type="button"
              @click.prevent="() => changePassword?.showModal()"
            >
              <icon name="ic:round-edit-note" class="w-5 h-5" size="100%" />
              {{ t("password.change") }}
            </button>
          </label>
        </div>
        <app-dynamic-settings
          v-model="dyn.data.value"
          :unchanged="dyn.unchanged.value"
        />
      </div>
    </div>

    <label class="label" for="profile">
      <span class="pl-3 label-text">{{ t("profile") }}</span>
    </label>
    <client-only>
      <content-editor
        id="profile"
        ref="editor"
        v-model.lazy="profile"
        :html="user.profile?.html"
        class="safari-performance-boost"
        @update:model-value="profileEdited = true"
      />
    </client-only>
  </section>
</template>

<style lang="scss" scoped>
.hoverable {
  img,
  .btn {
    transition: opacity 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
    overflow: hidden;
    border: none;
  }

  .btn {
    opacity: 0;
  }

  &:hover {
    .btn {
      opacity: 1;
    }
  }
}

.label-text {
  @apply font-semibold;
}

.dropzone {
  @apply flex flex-col justify-center items-center w-full h-64 bg-gbase-50 rounded-lg border-2 border-gbase-300 border-dashed cursor-pointer;
  @apply dark:bg-gbase-700 hover:bg-gbase-100 dark:border-gbase-600 dark:hover:border-gbase-500 dark:hover:bg-gbase-600;
  @apply hover:shadow-lg;
  @apply transition-shadow transition-colors;
}

._avatar {
  min-width: 150px;
  max-width: 200px;
  @apply object-cover aspect-square;
}
</style>
