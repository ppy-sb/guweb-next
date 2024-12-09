<script setup lang="ts">
import { useSession } from '~/store/session'

const scrollY = useScrollYObserver()
const { t } = useI18n()
const session = useSession()
const route = useRoute()

const searchModalWrapper = shallowRef<{
  searchModal: {
    showModal: () => void
  }
}>()

const detached = shallowRef(false)
watch(scrollY, () => (detached.value = scrollY.value > 0))
const root = shallowRef<HTMLElement>()

const shownMenu = shallowReactive({
  left: false,
  right: false,
  user: false,
})

function clearFocus() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}
</script>

<template>
  <app-search-modal ref="searchModalWrapper" />
  <div
    ref="root" class="w-full transition-[padding] sticky p-0 top-0 navbar-container z-40 h-16"
    :class="[detached && 'detached']"
  >
    <div
      class="navbar w-full transition-[border-radius]" :class="[
        shownMenu.left && 'navbar-tint',
        shownMenu.user && 'navbar-tint',
      ]"
    >
      <div class="self-start -navbar-start me-auto">
        <label for="app-drawer-toggle" class="btn btn-ghost drawer-button lg:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </label>
        <app-nav-brand class="hidden lg:flex" />
        <button
          class="btn btn-ghost btn-circle lg:hidden"
          @click.prevent="() => searchModalWrapper?.searchModal?.showModal()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" size="100%" fill="none" viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
      <div class="-navbar-end self-end items-baseline !gap-2">
        <ul class="hidden menu nav-menu menu-horizontal lg:inline-flex flex-nowrap">
          <app-nav-items />
        </ul>
        <button
          class="invisible btn btn-ghost btn-circle flex lg:visible"
          @click.prevent="() => searchModalWrapper?.searchModal?.showModal()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" size="100%" fill="none" viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
        <div class="self-center dropdown dropdown-end">
          <label tabindex="0" class="flex pr-1 transition-transform cursor-pointer active:scale-90">
            <img v-if="session.loggedIn" :src="session.$state.user?.avatarSrc" class="avatar-img">
            <icon v-else class="w-full h-full avatar-img" name="solar:emoji-funny-circle-broken" />
          </label>
          <ul
            tabindex="0" class="p-2 mt-4 menu menu-tint menu-md dropdown-content w-52" :class="{
              'dropdown-open': shownMenu.user,
            }"
          >
            <template v-if="session.loggedIn">
              <li>
                <nuxt-link-locale
                  :to="{
                    name: 'me-settings',
                  }" @click="clearFocus"
                >
                  <icon name="solar:settings-bold" class="w-5 h-5" size="100%" />
                  {{ t('title.settings') }}
                </nuxt-link-locale>
              </li>
              <li>
                <nuxt-link-locale
                  :to="{
                    name: 'me-relations',
                  }" @click="clearFocus"
                >
                  <icon name="tabler:circles-relation" class="w-5 h-5" size="100%" />
                  {{ t('title.relations') }}
                </nuxt-link-locale>
              </li>
              <li>
                <nuxt-link-locale
                  :to="{
                    name: 'user-handle',
                    params: {
                      handle: `@${session.$state.user?.safeName}`,
                    },
                  }" @click="clearFocus"
                >
                  <icon name="mingcute:profile-fill" class="w-5 h-5" size="100%" />
                  {{ t('title.userpage') }}
                </nuxt-link-locale>
              </li>
              <li v-if="session.$state.role.staff">
                <nuxt-link-locale
                  :to="{
                    name: 'admin',
                  }" @click="clearFocus"
                >
                  <icon name="material-symbols:admin-panel-settings-rounded" class="w-5 h-5" size="100%" />
                  {{ t('title.admin-panel') }}
                </nuxt-link-locale>
              </li>
              <div class="my-0 divider" />
              <li>
                <nuxt-link-locale :to="{ name: 'auth-logout', query: { redirect: route.fullPath } }" @click="clearFocus">
                  <icon name="majesticons:logout-half-circle-line" class="w-5 h-5" size="100%" />
                  {{ $t('global.logout') }}
                </nuxt-link-locale>
              </li>
            </template>
            <template v-else>
              <li>
                <nuxt-link-locale :to="{ name: 'auth-login', query: { redirect: route.fullPath } }" @click="clearFocus">
                  <icon name="majesticons:login-half-circle-line" class="w-5 h-5" size="100%" />
                  {{ $t('global.login') }}
                </nuxt-link-locale>
              </li>
              <li>
                <nuxt-link-locale :to="{ name: 'auth-register' }" @click="clearFocus">
                  <icon name="mingcute:signature-fill" class="w-5 h-5" size="100%" />
                  {{ $t('global.register') }}
                </nuxt-link-locale>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss">
.navbar-tint,
.detached>.navbar {
  @apply bg-gbase-100/85 dark:bg-gbase-700/80;
  @apply backdrop-blur-md shadow-md;
  @apply backdrop-saturate-[0.9] backdrop-brightness-[0.95];
  @apply dark:backdrop-saturate-[1] dark:backdrop-brightness-[1];
}

.navbar {
  @apply border-[1px] border-gbase-50/0 dark:border-gbase-500/0;
  transition: all 0.5s cubic-bezier(0.05, 1, 0.4, 0.95);

  & .btn,
  & a,
  & label.dropdown {
    @apply outline-transparent;
    @apply transition-all;
  }

  & ul.nav-menu {
    @apply p-0;
    @apply transition-[padding];
  }

  & ul.nav-menu>li,
  &.btn {
    min-height: 3em;
    height: 3em;
    @apply outline-transparent;
    @apply transition-all;
  }

  .navbar-center {
    select {
      @apply self-baseline;
    }
  }

  .avatar-img {
    @apply transition-all;
    @apply ring ring-gbase-600/70 ring-offset-gbase-100 ring-offset-2 pointer-events-none;
    @apply rounded-full object-cover aspect-square;
    @apply w-8 h-8;
  }

  & .navbar-end {
    @apply transition-[gap];
    @apply gap-0;
  }
}

.detached {
  @apply px-2 pt-1;

  & .navbar {
    @apply border-gbase-50/30 dark:border-gbase-500/30;
    @apply rounded-2xl;
    @apply min-h-0;

    .avatar-img {
      @apply transition-all;
      @apply w-7 h-7;
    }

    /* > ul > li */
    & ul.nav-menu>li {
      @apply justify-center;
    }

    & select {
      @apply transition-all;
      @apply origin-top scale-95;
    }

    & .btn,
    & ul.nav-menu>li {
      height: 2rem;
      min-height: 2rem;
      @apply outline-transparent;
      @apply transition-all;

      &.btn-circle {
        width: 2rem;
        min-width: 2rem;
      }

      & a {
        @apply m-0
      }
    }

    & .navbar-end {
      @apply transition-[gap];
      @apply gap-2;
    }
  }
}
</style>

<style lang="postcss" scoped>
.menu-tint {
  @apply shadow rounded-box bg-base-100/80 backdrop-blur-lg;
}

.detached {
  .menu-tint {
    @apply bg-base-100;
  }
}
</style>
