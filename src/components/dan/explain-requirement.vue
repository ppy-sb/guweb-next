<script setup lang="ts">
import { type Cond, type Requirement } from '~/def/dan'

defineProps<{
  requirement: {
    id: string
    type: Requirement
    cond: Cond
  } }>()

const tRequirement = localeKey.root.dan.requirement

const { t } = useI18n()
</script>

<i18n lang="yaml">
en-GB:
  requirement: 'Requirement: '

zh-CN:
  requirement: '判定: '
</i18n>

<template>
  <div class="border-l-4 border-secondary ps-3">
    <p class="mb-1">
      <span>{{ t('requirement') }}</span>
      <span class="font-bold">{{ t(tRequirement[requirement.type].__path__) }}</span>
    </p>
    <app-dan-explain-cond :cond="requirement.cond" />
  </div>
</template>
