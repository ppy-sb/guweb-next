<script setup lang="ts">
import { useSession } from '~/store/session'

const session = useSession()
const { t, locale, locales, setLocale, localeProperties } = useI18n()

const langSw = ref<HTMLDetailsElement>()

function clearFocus() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}
</script>

<template>
  <slot name="start" />
  <li>
    <nuxt-link-locale :to="{ name: 'leaderboard-mode' }" @click="clearFocus">
      <icon name="ph:ranking-fill" class="w-5 h-5" size="100%" />
      {{ t('title.leaderboard') }}
    </nuxt-link-locale>
  </li>
  <li>
    <nuxt-link-locale :to="{ name: 'clans' }" @click="clearFocus">
      <icon name="ic:outline-group-work" class="w-5 h-5" size="100%" />
      {{ t('title.clans') }}
    </nuxt-link-locale>
  </li>
  <li>
    <nuxt-link-locale :to="{ name: 'dans' }" @click="clearFocus">
      <icon name="ic:outline-group-work" class="w-5 h-5" size="100%" />
      [{{ t('global.wip') }}] {{ t('title.dans') }}
    </nuxt-link-locale>
  </li>
  <li v-if="session.role.staff">
    <nuxt-link-locale :to="{ name: 'status' }" @click="clearFocus">
      <icon name="material-symbols:signal-cellular-alt-rounded" class="w-5 h-5" size="100%" />
      {{ t('title.status') }}
    </nuxt-link-locale>
  </li>
  <li tabindex="0">
    <details ref="langSw">
      <summary><icon name="tabler:world" class="w-5 h-5" />{{ localeProperties.name }}</summary>
      <ul class="mt-0 right-0 w-64">
        <li
          v-for="l in locales"
          :key="l.code"
          :class="{
            disabled: l.code === locale,
          }"
        >
          <a
            class="whitespace-nowrap"
            :class="{
              active: l.code === locale,
            }" @click="setLocale(l.code), langSw?.toggleAttribute('open', false)"
          >
            <img
              :alt="l.name" class="h-6"
              :src="getFlagURL(l.flag)"
            > {{ l.name }}
          </a>
        </li>
      </ul>
    </details>
  </li>
  <!-- <li tabindex="0">
    <a class="justify-between lg:justify-start">
      Parent
      <svg class="fill-current hidden lg:block" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" /></svg>
      <svg class="fill-current lg:hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
    </a>
    <ul class="p-2 menu m-4 bg-base-100">
      <li><a>Submenu 1</a></li>
      <li><a>Submenu 2</a></li>
    </ul>
  </li>
  <li><a>Item 3</a></li> -->
</template>
