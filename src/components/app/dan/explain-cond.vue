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
const disabled = true

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
    <span v-if="cond.type === OP.NoPause" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      No Pause
    </span>
    <span v-else-if="cond.type === OP.ModeEq" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Mode = <img
        :alt="cond.val"
        :src="`/icons/mode/${icon.mode[cond.val].icon}.svg`"
        class="color-theme-light-invert w-4 h-4 inline mx-1"
      ><span class="font-bold">{{ cond.val }}</span>
    </span>
    <span v-else-if="cond.type === OP.Extends" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Satisfies all requirements in <span class="font-bold">{{ Requirement[cond.val] }}</span>
    </span>
    <span v-else-if="cond.type === OP.AccGte" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Accuracy ≥ <span class="font-bold">{{ cond.val }}%</span>
    </span>
    <span v-else-if="cond.type === OP.ScoreGte" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Score ≥ <span class="font-bold">{{ cond.val }}%</span>
    </span>
    <span v-else-if="cond.type === OP.BanchoBeatmapIdEq" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Beatmap ID = <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a> in Bancho
    </span>
    <span v-else-if="cond.type === OP.BeatmapMd5Eq" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded">
      Beatmap MD5 = <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a>
    </span>
    <span v-else-if="cond.type === OP.WithStableMod" class="bg-secondary/20 dark:bg-secondary/80text-secondary-content leading-loose px-1 rounded space-x-3">
      <span>Played with</span>
      <template v-for="mod in $enum(StableMod).getValues()" :key="mod">
        <span v-if="((cond.val as number) & mod)" class="font-bold">
          {{ StableMod[mod] }}
        </span>
      </template>
      <span>mod</span>
    </span>
  </template>
  <template v-else>
    <div v-if="cond.type === OP.Remark">
      <span>Remark: </span>
      <span class="font-semibold">{{ cond.remark }}</span>
      <app-dan-explain-cond :cond="cond.cond" />
    </div>
    <span v-else-if="cond.type === OP.NOT">
      <span class="badge badge-accent bg-accent/40 dark:bg-accent">Not</span>
      <span>&nbsp;</span>
      <app-dan-explain-cond :cond="cond.cond" />
    </span>
    <template
      v-else-if="cond.type === OP.AND || cond.type === OP.OR"
    >
      <div
        class="border-l-4 ps-3 inline-block my-1" :class="{
          'border-neutral': cond.type === OP.AND,
          'border-accent/30': cond.type === OP.OR,
        }"
      >
        <template v-for="_cond, i in cond.cond" :key="i">
          <app-dan-explain-cond :cond="_cond" :list-mode="true" />
          <template v-if="i < cond.cond.length - 1">
            <br v-if="cond.type === OP.OR">
            <span
              :class="{
                'badge badge-accent bg-accent/40 dark:bg-accent': cond.type === OP.OR,
              }"
            >{{ cond.type === OP.AND ? ',' : ' or ' }}</span>
            <br>
          </template>
          <span v-else>.</span>
        </template>
      </div>
    </template>
  </template>
</template>
