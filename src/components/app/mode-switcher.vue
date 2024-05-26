<script setup lang="ts">
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem } from '~/def/common'
import * as icon from '~/common/icon'
import type { RouteLocationRaw } from '#vue-router'

export interface SwitcherState {
  mode?: ActiveMode
  ruleset?: ActiveRuleset
  rankingSystem?: LeaderboardRankingSystem
}

const props = defineProps<{
  showSort?: boolean
  modelValue?: SwitcherState
  toHref?(switcher: SwitcherState): RouteLocationRaw
}>()

const emit = defineEmits<{
  (event: 'input', res: SwitcherState): void
  (event: 'update:modelValue', res: SwitcherState): void
}>()

const { hasLeaderboardRankingSystem, hasRuleset, supportedModes, supportedRulesets, supportedLeaderboardRankingSystems } = useAdapterConfig()
useI18n()

const [switcher, setSwitcher] = useLeaderboardSwitcher(
  toRaw(props.modelValue) || {},
)
function emitData() {
  emit('input', toRaw(switcher))
  emit('update:modelValue', toRaw(switcher))
}
watch(switcher, () => emitData())
</script>

<template>
  <div class="mt-4 grid sm:mt-0 md:gap-1">
    <div class="flex justify-around gap-4 md:gap-2 lg:gap-4">
      <a
        v-for="mode in supportedModes"
        :key="mode"
        class="h-mode hover-floating"
        :class="{
          '!opacity-80 pointer-events-none': switcher.mode === mode,
          '!opacity-10 pointer-events-none':
            switcher.ruleset && !hasRuleset(mode, switcher.ruleset),
        }"
        :href="$router.resolve(toHref?.({ ...switcher, mode }) as any).fullPath"
        @click.prevent="setSwitcher({ mode })"
      >
        <img
          :src="`/icons/mode/${icon.mode[mode].icon}.svg`"
          class="color-theme-light-invert"
        >
      </a>
    </div>
    <div class="flex justify-around gap-4 md:gap-2 lg:gap-4">
      <a
        v-for="ruleset in supportedRulesets"
        :key="ruleset"
        class="h-mode hover-floating"
        :class="{
          '!opacity-80 pointer-events-none': switcher.ruleset === ruleset,
          '!opacity-20 pointer-events-none':
            switcher.mode && !hasRuleset(switcher.mode, ruleset),
        }"
        :href="$router.resolve(toHref?.({ ...switcher, ruleset }) as any).fullPath"
        @click.prevent="setSwitcher({ ruleset })"
      >
        {{ $t(localeKey.ruleset(ruleset)) }}
      </a>
    </div>
    <div
      v-if="props.showSort"
      class="flex justify-center gap-3 md:gap-3 lg:gap-3"
    >
      <template
        v-for="rankingSystem in supportedLeaderboardRankingSystems"
        :key="rankingSystem"
      >
        <a
          v-if="
            hasRuleset(switcher.mode, switcher.ruleset)
              && hasLeaderboardRankingSystem(
                switcher.mode,
                switcher.ruleset,
                rankingSystem,
              )
          "
          class="text-sm h-mode"
          :class="{
            '!opacity-80 pointer-events-none':
              switcher.rankingSystem === rankingSystem,
          }"
          :href="$router.resolve(toHref?.({ ...switcher, rankingSystem }) as any).fullPath"
          @click.prevent="setSwitcher({ rankingSystem })"
        >
          {{ $t(localeKey.rankingSystem(rankingSystem)) }}
        </a>
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.h-mode {
  @apply py-0 my-3 transition duration-200 ease-in-out font-semibold opacity-50 cursor-pointer;
  @apply sm:py-1 sm:my-0;
  @apply hover:opacity-100;

  & img {
    @apply w-7 h-7 p-[1px];
  }
}
</style>
