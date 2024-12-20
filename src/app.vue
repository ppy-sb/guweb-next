<script lang="ts" setup>
const scrollY = useScrollYObserver()
const { status } = useZoomModal()
</script>

<template>
  <nuxt-loading-indicator />
  <div id="app-drawer" class="drawer flex flex-col min-h-[100dvh]">
    <app-nav />
    <input id="app-drawer-toggle" type="checkbox" class="drawer-toggle">
    <!-- Page content here -->
    <NuxtLayout
      id="layout"
      viewport
      :class="safariDetector() ? 'safari' : 'not-safari'"
      class="drawer-content zoom-modal-container overflow-x-clip"
      :data-l1-status="status"
      data-l2-status="hidden"
      :style="
        status !== 'closed' && {
          'transform-origin': `center calc(${scrollY} * 1px + 50dvh)`,
        }
      "
    >
      <NuxtPage />
    </NuxtLayout>
    <app-footer class="mt-auto" />
    <div class="drawer-side z-40">
      <label
        for="app-drawer-toggle"
        aria-label="Close sidebar"
        class="drawer-overlay"
      />
      <ul class="menu p-4 w-80 min-h-full bg-base-200">
        <app-nav-items>
          <template #start>
            <li>
              <app-nav-brand />
            </li>
          </template>
        </app-nav-items>
      </ul>
    </div>
  </div>
</template>

<style lang="scss">
@use "~/assets/styles/modal.scss" as m;

$zoom-content-stage1: saturate(0.4) opacity(0.8);
$zoom-content-stage2: saturate(0.4) opacity(0.2);

$scale: scale(0.98);
$scale2: scale(0.96);

.zoom-modal-container {

  &[data-l1-status="show"] {

    &[data-l2-status="hidden"] {
      animation: zoomOutModalContent m.$duration m.$animate-function forwards;
    }

    &[data-l2-status="show"] {
      animation: zoomOutModalContentL2 m.$duration m.$animate-function forwards !important;
    }

    &[data-l2-status="closing"] {
      animation: zoomInModalContentL2 m.$duration m.$animate-function forwards;
    }

  }

  &[data-l1-status="closing"] {
    animation: zoomInModalContent m.$duration m.$animate-function forwards;
  }
}

@keyframes zoomOutModalContent {
  0% {
    transform: scale(1);
  }

  100% {
    transform: $scale;
    filter: $zoom-content-stage1;
  }
}

@keyframes zoomInModalContent {
  0% {
    transform: $scale;
    filter: $zoom-content-stage1;
  }

  100% {
    transform: scale(1);
  }
}

@keyframes zoomOutModalContentL2 {
  0% {
    transform: $scale;
    filter: $zoom-content-stage1;
  }

  100% {
    transform: $scale2;
    filter: $zoom-content-stage2;
  }
}

@keyframes zoomInModalContentL2 {
  0% {
    transform: $scale2;
    filter: $zoom-content-stage2;
  }

  100% {
    transform: $scale;
    filter: $zoom-content-stage1;
  }
}
</style>

<style lang="postcss">
.zoom-modal-container[data-l2-status="show"] > dialog::backdrop {
  z-index: 1000 !important;
}

#app-drawer .drawer-toggle:checked ~ .drawer-side > .drawer-overlay {
  @apply bg-gbase-950/30 dark:bg-gbase-950/70;
  @apply transition-colors;
  transition-duration: 350ms;
}

#app-drawer .drawer-content > * {
  transition-property: transform, filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 350ms;
  transition-delay: 30ms;

}

#app-drawer .drawer-toggle:checked ~ .drawer-content > * {
  @apply translate-x-5;
  transition-duration: 250ms;
  transition-delay: 50ms;
  filter: saturate(0.5);
}
</style>

<style>
#layout.safari {
  -webkit-overflow-scrolling: touch;

  .notify-safari-something-will-change {
    will-change: transform, filter;
  }
}
</style>
