<script setup lang="ts">
import md5 from 'md5'
import type { HTMLAttributes, InputHTMLAttributes } from 'vue'
import { CountryCode } from '~/def/country-code'
import { UserRole } from '~/def/user'
import { useSession } from '~/store/session'

const DISALLOW_USER_EDIT_ITSELF_ROLE = new Set([
  UserRole.Owner,
  UserRole.Admin,
  UserRole.Staff,
])

const app = useNuxtApp()
const { t } = useI18n()
const route = useRoute('admin-users-id')
const adapter = useAdapterConfig()
const session = useSession()

const error = ref<Error>()
const f = await app.$client.admin.userManagement.detail.query(route.params.id)
const detail = ref(f as typeof f & { password?: string })
const _unchanged = ref(detail.value)

// eslint-disable-next-line antfu/no-const-enum
const enum Status {
  Idle,
  Pending,
  Succeed,
  Errored,
}
const icon = {
  [Status.Idle]: 'ic:round-save',
  [Status.Succeed]: 'line-md:confirm',
  [Status.Errored]: 'line-md:cancel',
} as const
const status = ref(Status.Idle)

const opts = computed(() =>
  createOptions(UserRole, (_, v) => t(localeKey.role(v)))
    .map((item) => {
      const attrs: HTMLAttributes & InputHTMLAttributes = {}
      if (
        (session.user?.id === detail.value.id && DISALLOW_USER_EDIT_ITSELF_ROLE.has(item.value)) // prevent self from removing its priv
        || !isEditable(session.role, item.value)
      ) {
        attrs.disabled = true
      }

      return { ...item, attrs }
    })
    .filter(i => adapter.supportedRoles.includes(i.value))
)

useHead({
  titleTemplate: title => `${title} - ${t(localeKey.server.name.__path__)}`,
  title: () => `${_unchanged.value.name} - ${t(localeKey.title['admin-panel'].__path__)}`,
})

async function save() {
  error.value = undefined
  status.value = Status.Pending
  try {
    const send = {
      ...detail.value,
      password: detail.value.password
        ? md5(detail.value.password)
        : undefined,
    }

    const newValue = await app.$client.admin.userManagement.saveDetail.mutate([route.params.id, send])

    status.value = Status.Succeed
    detail.value = { ...newValue }
    _unchanged.value = detail.value
  }
  catch (e) {
    status.value = Status.Errored
    if (e instanceof Error) {
      error.value = e
    }
  }
}

// TODO server validation impl same logic
function isEditable(stat: Record<'admin' | 'owner' | 'staff', boolean>, role: UserRole) {
  switch (role) {
    case UserRole.Admin: {
      return stat.owner
    }
    case UserRole.Staff: {
      return stat.admin || stat.owner
    }
    case UserRole.Owner: {
      return stat.owner
    }
    default:
      return true
  }
}
</script>

<i18n lang="yaml">
en-GB:
  id: ID
  stable-client-id: Stable Client ID
  name: Name
  link-name: Link (Safe name)
  password: Password
  email: Email
  flag: Flag
  roles: Roles
  save-btn: Save
zh-CN:
  id: ID
  stable-client-id: Stable Client ID
  name: 名称
  link-name: 引用名称
  password: 密码
  email: 邮箱
  flag: 国家或地区
  roles: 角色
  save-btn: 保存
fr-FR:
  id: Identifiant
  stable-client-id: Identifiant Stable Client
  name: Nom
  link-name: Lien (Nom sécurisé)
  password: Mot de passe
  email: Email
  flag: Drapeau
  roles: Rôles
  save-btn: Enregistrer
de-DE:
  id: ID
  stable-client-id: Stabile Client-ID
  name: Name
  link-name: Link-Adresse (Sicherer Name)
  password: Passwort
  email: E-Mail
  flag: Flagge
  roles: Rollen
  save-btn: Speichern
</i18n>

<template>
  <div v-if="detail" class="container custom-container">
    <div v-if="error" class="overflow-x-auto text-left alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 stroke-current shrink-0" fill="none" viewBox="0 0 24 24">
        <path
          stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <pre>{{ formatGucchoError(error) }}</pre>
    </div>
    <dl>
      <div class="striped">
        <dt class="striped-dt">
          {{ t('id') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.id" type="text" class="w-full input input-sm">
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('stable-client-id') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.stableClientId" disabled type="text" class="w-full input input-sm">
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('name') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.name" type="text" class="w-full input input-sm">
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('link-name') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.safeName" type="text" class="w-full input input-sm">
        </dd>
      </div>
      <div class="striped">
        <dt class="striped-dt">
          {{ t('password') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.password" type="text" class="w-full input input-sm">
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('email') }}
        </dt>
        <dd class="striped-text">
          <input v-model="detail.email" type="text" class="w-full input input-sm">
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('flag') }}
        </dt>
        <dd class="flex items-bottom gap-2 striped-text">
          <img :alt="detail.flag" :src="getFlagURL(detail.flag)" class="w-6">
          <select v-model="detail.flag" class="w-full select select-sm">
            <option
              v-for="countryCode in CountryCode" :key="countryCode" :disabled="countryCode === detail.flag"
              :selected="countryCode === detail.flag" :value="countryCode"
            >
              <template v-if="countryCode === CountryCode.Unknown">
                ❓
              </template>
              <template v-else-if="countryCode === detail.flag">
                ➖
              </template>
              <template v-else>
                {{ getFlagEmoji(countryCode) }}
              </template>
              {{ $t(localeKey.country(countryCode)) }}
            </option>
          </select>
        </dd>
      </div>

      <div class="striped">
        <dt class="striped-dt">
          {{ t('roles') }}
        </dt>
        <dd class="striped-text">
          <t-multi-checkbox v-model="detail.roles" size="sm" :options="opts" />
        </dd>
      </div>
    </dl>
    <button
      class="btn btn-shadow" :class="{
        'loading': status === Status.Pending,
        'btn-success': status === Status.Succeed,
        'btn-error': status === Status.Errored,
      }" @click="save"
    >
      {{ t('save-btn') }}
      <Icon v-if="status !== Status.Pending" :name="icon[status]" class="w-5 h-5" />
    </button>
  </div>
</template>
