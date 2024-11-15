<script setup lang="ts">
import { StableMod } from '~/def/score'

const props = defineProps<{
  mod: StableMod
}>()

const icons: Record<typeof StableMod[keyof typeof StableMod], string> = {
  [StableMod.NoMod]: 'nonicons:vim-normal-mode-16',
  [StableMod.NoFail]: 'material-symbols:health-and-safety-rounded',
  [StableMod.Easy]: 'charm:candy',
  [StableMod.TouchDevice]: 'ic:outline-touch-app',
  [StableMod.Hidden]: 'fluent:border-none-24-filled',
  [StableMod.HardRock]: 'mdi:guitar-electric',
  [StableMod.SuddenDeath]: 'mdi:death',
  [StableMod.DoubleTime]: 'mdi:clock-fast',
  [StableMod.Relax]: 'tabler:keyboard-off',
  [StableMod.HalfTime]: 'fluent:slow-mode-24-filled',
  [StableMod.Nightcore]: 'icon-park-solid:headphone-sound',
  [StableMod.Flashlight]: 'jam:flashlight-on',
  [StableMod.Autoplay]: 'icon-park-twotone:robot-one',
  [StableMod.SpunOut]: 'uil:fidget-spinner',
  [StableMod.Autopilot]: 'foundation:guide-dog',
  [StableMod.Perfect]: 'icon-park-solid:thumbs-up',
  [StableMod['1K']]: 'ic:round-1k',
  [StableMod['2K']]: 'ic:round-2k',
  [StableMod['3K']]: 'ic:round-3k',
  [StableMod['4K']]: 'ic:round-4k',
  [StableMod['5K']]: 'ic:round-5k',
  [StableMod['6K']]: 'ic:round-6k',
  [StableMod['7K']]: 'ic:round-7k',
  [StableMod['8K']]: 'ic:round-8k',
  [StableMod['9K']]: 'ic:round-9k',
  [StableMod.FadeIn]: 'ic:outline-gradient',
  [StableMod.Random]: 'ic:outline-gradient',
  [StableMod.Cinema]: 'mdi:cinema',
  [StableMod.Target]: 'ph:target-bold',
  [StableMod.KeyCoop]: '',
  [StableMod.ScoreV2]: 'material-symbols:filter-2-outline',
  [StableMod.LastMod]: '',
}
</script>

<template>
  <icon :name="icons[props.mod]" />
</template>
