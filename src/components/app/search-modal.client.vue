<i18n lang="yaml">
en-GB:
  include:
    beatmapsets: Beatmapsets
    beatmaps: Beatmaps
    users: Users
    pages: Pages
  search: Search...
  nothing: Found nothing.

zh-CN:
  include:
    beatmapsets: 歌曲
    beatmaps: 铺面
    users: 用户
    pages: 导航
  search: 搜索
  nothing: 什么都没找到。

fr-FR:
  include:
    beatmapsets: Beatmapsets
    beatmaps: Beatmaps
    users: Utilisateurs
    pages: Pages
  search: Cherche...
  nothing: Aucun résultat.

de-DE:
  include:
    beatmapsets: Beatmapsets
    beatmaps: Beatmaps
    users: Benutzer
    pages: Seiten
  search: Suche...
  nothing: Nichts gefunden.
</i18n>

<script setup lang="ts">
const searchModal = shallowRef<{
  showModal: () => void
}>()
defineExpose({
  searchModal,
})
const { t } = useI18n()

const {
  includes,
  raw,
  onInput,
  mode,
  keyword,
  tags,
  results: {
    beatmaps,
    beatmapsets,
    users,
    pages,
  },
  loading,
  nothing,
} = await useSearchResult()
</script>

<template>
  <t-modal ref="searchModal" v-slot="{ closeModal }" class="m-0 w-full max-h-[100dvh] my-8 max-w-screen-md mx-auto overflow-visible text-base-content ">
    <div class="card-actions">
      <div class="flex flex-col items-baseline gap-4 pl-3 sm:flex-row">
        <div class="form-control">
          <label class="flex gap-2 p-0 cursor-pointer label">
            <input
              v-model="includes.beatmapsets" type="checkbox" class="checkbox checkbox-sm" @change="() => {
                // includes.users = !includes.beatmaps && !includes.beatmapsets
                raw(true)
              }"
            >
            <span class="label-text">{{ t('include.beatmapsets') }}</span>
          </label>
        </div>
        <div class="form-control">
          <label class="flex gap-2 p-0 cursor-pointer label">
            <input
              v-model="includes.beatmaps" type="checkbox" class="checkbox checkbox-sm" @change="() => {
                // includes.users = !includes.beatmaps && !includes.beatmapsets
                raw(true)
              }"
            >
            <span class="label-text">{{ t('include.beatmaps') }}</span>
          </label>
        </div>
        <div class="form-control">
          <label class="flex gap-2 p-0 cursor-pointer label">
            <input
              v-model="includes.users" type="checkbox" class="checkbox checkbox-sm" @change="() => {
                // if (!includes.beatmaps && !includes.beatmapsets) {
                //   includes.beatmaps = true
                //   includes.beatmapsets = true
                // }
                raw(false)
              }"
            >
            <span class="label-text">{{ t('include.users') }}</span>
          </label>
        </div>
        <div class="form-control">
          <label class="flex gap-2 p-0 cursor-pointer label">
            <input
              v-model="includes.pages" type="checkbox" class="checkbox checkbox-sm" @change="() => {
                // includes.users = !includes.beatmaps && !includes.beatmapsets
                raw(true)
              }"
            >
            <span class="label-text">{{ t('include.pages') }}</span>
          </label>
        </div>
      </div>
      <div class="ms-auto" />
      <button class="btn btn-ghost btn-sm" @click="closeModal()">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <div class="bg-gbase-50 dark:bg-gbase-800 shadow-2xl md:rounded-2xl relative max-h-[calc(100dvh-32px-4rem)] flex flex-col overflow-hidden">
      <form action="#" method="post" class="w-full space-y-2" @submit.prevent="raw(true)">
        <input
          v-model="keyword"
          type="text"
          :placeholder="t('search')"
          class="input input-shadow w-full border-label-0 focus:input-primary bg-transparent !outline-0"
          @input="onInput"
        >
        <div
          v-if="mode === 'beatmap' && tags.length"
          class="bg-transparent space-x-1"
        >
          <span v-for="tag, index in tags" :key="index" class="gap-1 cursor-pointer badge badge-md badge-primary whitespace-nowrap" @click="tags.splice(index, 1)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            <div v-html="tag.toString()" />
          </span>
        </div>
      </form>
      <div class="overflow-auto">
        <template
          v-if="includes.pages && pages.length "
        >
          <transition-group tag="ul" class="menu" name="left">
            <li
              v-for="page, index in pages"
              :key="`searchResult-page-${index}`"
            >
              <nuxt-link-locale
                :to="(page.route() as typeof page.route | undefined)"
                @click="closeModal()"
              >
                <div class="flex items-center gap-2">
                  <component :is="page.render" />
                </div>
              </nuxt-link-locale>
            </li>
          </transition-group>
        </template>
        <template
          v-if="Array.isArray(beatmapsets) && beatmapsets.length"
        >
          <div class="font-bold divider">
            <span v-if="loading.beatmapsets" class="loading loading-spinner loading-lg" /> {{ $t('global.beatmapsets') }}
          </div>
          <transition-group tag="ul" class="menu" name="left">
            <li
              v-for="bs in beatmapsets"
              :key="`searchResult-bs-${bs.id}`"
            >
              <nuxt-link-locale
                :to="{
                  name: 'beatmapset-id',
                  params: {
                    id: bs.id,
                  },
                }"
                @click="closeModal()"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="isBanchoBeatmapset(bs)"
                    class="h-[30px] w-[30px] mask mask-squircle overflow-hidden object-cover aspect-square"
                    :src="`https://b.ppy.sh/thumb/${bs.foreignId}.jpg`"
                    :onerror="placeholder"
                  >
                  <span>{{ bs.meta.intl.artist }} -
                    {{ bs.meta.intl.title }}</span>
                </div>
              </nuxt-link-locale>
            </li>
          </transition-group>
        </template>
        <template v-if="Array.isArray(beatmaps) && beatmaps.length">
          <div class="font-bold divider">
            <span v-if="loading.beatmaps" class="loading loading-spinner loading-lg" /> {{ $t('global.beatmaps') }}
          </div>
          <transition-group tag="ul" class="truncate menu" name="left">
            <li
              v-for="bm in beatmaps"
              :key="`searchResult-bm-${bm.id}`"
            >
              <nuxt-link-locale
                :to="{
                  name: 'beatmapset-id',
                  params: {
                    id: bm.beatmapset.id,
                  },
                }"
                @click="closeModal()"
              >
                <div class="flex items-center max-w-full gap-2">
                  <img
                    v-if="isBanchoBeatmapset(bm.beatmapset)"
                    class="h-[30px] w-[30px] mask mask-squircle overflow-hidden object-cover aspect-square"
                    :src="`https://b.ppy.sh/thumb/${bm.beatmapset.foreignId}.jpg`"
                    :onerror="placeholder"
                  >
                  <span class="text-ellipsis">{{ bm.beatmapset.meta.intl.artist }} - {{ bm.beatmapset.meta.intl.title }} [{{ bm.version }}]</span>
                </div>
              </nuxt-link-locale>
            </li>
          </transition-group>
        </template>
        <template v-if="Array.isArray(users) && users.length">
          <div class="font-bold divider">
            <span v-if="loading.users" class="loading loading-spinner loading-lg" /> {{ $t('global.users') }}
          </div>
          <transition-group tag="ul" class="menu" name="left">
            <li
              v-for="user in users"
              :key="`searchResult-user-${user.safeName}`"
            >
              <nuxt-link-locale
                :to="{
                  name: 'user-handle',
                  params: {
                    handle: `@${user.safeName}`,
                  },
                }"
                @click="closeModal()"
              >
                <div class="flex items-center gap-2">
                  <img
                    :src="user.avatarSrc"
                    class="w-[30px] h-[30px] mask mask-squircle overflow"
                    :onerror="placeholder"
                  >
                  <span>{{ user.name }}</span>
                </div>
              </nuxt-link-locale>
            </li>
          </transition-group>
        </template>
        <template v-if="nothing">
          <div class="divider" />
          <div class="p-5 pt-0">
            {{ t('nothing') }}
          </div>
        </template>
      </div>
    </div>
  </t-modal>
</template>
