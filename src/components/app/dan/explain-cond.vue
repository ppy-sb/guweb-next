<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import {
  type ConcreteCondOP,
  type Cond,
  OP,
  Requirement,
} from '~/def/dan'
import { StableMod } from '~/def/score'
import * as icon from '~/common/icon'

withDefaults(defineProps<{ listMode?: boolean; cond: Cond }>(), { listMode: false })
const fmtScore = createScoreFormatter()

const dan = localeKey.root.dan
const $cond = dan.cond

const inline = [
  OP.AccGte,
  OP.ScoreGte,
  OP.ModeEq,
  OP.BanchoBeatmapIdEq,
  OP.BeatmapMd5Eq,
  OP.WithStableMod,
  OP.Extends,
]
const concrete = inline.concat(OP.NoPause)

function isConcreteCond(op: OP): op is ConcreteCondOP | OP.Extends {
  return concrete.includes(op)
}
</script>

<template>
  <template v-if="isConcreteCond(cond.type)">
    <span v-if="cond.type === OP.NoPause" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      {{ $t($cond[cond.type].__path__) }}
    </span>

    <i18n-t v-else-if="cond.type === OP.ModeEq" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <img
          :alt="cond.val"
          :src="`/icons/mode/${icon.mode[cond.val].icon}.svg`"
          class="color-theme-light-invert w-4 h-4 align-middle mb-1 inline mx-1"
        >
        <span class="font-bold">{{ cond.val }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.Extends" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <span class="font-bold">{{ Requirement[cond.val] }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.AccGte" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <span class="font-bold">{{ cond.val }}%</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.ScoreGte" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <span class="font-bold">{{ fmtScore(cond.val) }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.BanchoBeatmapIdEq" :keypath="$cond[cond.type].__path__" tag="span" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.BeatmapMd5Eq" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded">
      <template #val>
        <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.WithStableMod" tag="span" :keypath="$cond[cond.type].__path__" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content px-1 rounded inline">
      <template #val>
        <template v-for="mod in $enum(StableMod).getValues()" :key="mod">
          <b v-if="((cond.val as number) & mod)">
            {{ StableMod[mod] }}&nbsp;
          </b>
        </template>
      </template>
    </i18n-t>
  </template>
  <template v-else>
    <i18n-t v-if="cond.type === OP.Remark" :keypath="$cond[cond.type].__path__">
      <template #remark>
        <span class="font-semibold">{{ cond.remark }}</span>
      </template>
      <template #val>
        <app-dan-explain-cond :cond="cond.cond" />
      </template>
    </i18n-t>
    <span v-else-if="cond.type === OP.NOT">
      <span class="badge badge-accent bg-accent/40 dark:bg-accent">{{ $t($cond[cond.type].__path__) }}</span>
      <span>&nbsp;</span>
      <app-dan-explain-cond :cond="cond.cond" />
    </span>
    <template
      v-else-if="cond.type === OP.AND || cond.type === OP.OR"
    >
      <div
        class="border-l-4 inline-block my-1" :class="{
          'border-neutral ps-3': cond.type === OP.AND,
          'border-accent/30 bg-accent/5 rounded px-3 py-2': cond.type === OP.OR,
        }"
      >
        <template v-for="_cond, i in cond.cond" :key="i">
          <app-dan-explain-cond :cond="_cond" :list-mode="true" />
          <template v-if="i < cond.cond.length - 1">
            <br v-if="cond.type === OP.OR" class="lg:hidden">
            <span
              :class="{
                'badge badge-accent bg-accent/40 dark:bg-accent me-1 lg:mx-1': cond.type === OP.OR,
              }"
            >{{ cond.type === OP.AND ? ',' : `${$t($cond[cond.type].__path__)}` }}</span>
            <br v-if="cond.type === OP.AND">
          </template>
        </template>
      </div>
    </template>
  </template>
</template>
