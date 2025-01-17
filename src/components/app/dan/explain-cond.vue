<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import {
  type ConcreteCondOP,
  type Cond,
  OP,
} from '~/def/dan'
import { StableMod } from '~/def/score'
import * as icon from '~/common/icon'
import type { PathAccessibleObject } from '~/common/utils'

withDefaults(defineProps<{ listMode?: boolean; cond: Cond; parent?: Cond }>(), { listMode: false })
interface Loc extends Record<string, PathAccessibleObject> {
  dan: {
    cond: Record<OP, string>
  }
}
const messages = Object.freeze({
  'en-GB': {
    dan: {
      cond: {
        [OP.AccGte]: 'Accuracy ≥ {val}',
        [OP.ScoreGte]: 'Score ≥ {val}',
        [OP.ModeEq]: 'Mode = {val}',
        [OP.RulesetEq]: 'Rule = {val}',
        [OP.BanchoBeatmapIdEq]: 'Beatmap ID = {val} on Bancho',
        [OP.BeatmapMd5Eq]: 'Beatmap MD5 = {val}',
        [OP.StableModIncludeAny]: 'Played with {val} mod(s)',
        [OP.StableModIncludeAll]: 'Must played with {val} mod',
        [OP.Extends]: 'Meet all requirements in {val}',
        [OP.OR]: 'Or',
        [OP.AND]: 'And',
        [OP.NOT]: 'Not',
        [OP.Remark]: 'Remark: {remark} {val}',
        [OP.NoPause]: 'No Pause',
      },
    },
  },
  'zh-CN': {
    dan: {
      cond: {
        [OP.AccGte]: '准确度 ≥ {val}',
        [OP.ScoreGte]: '总分 ≥ {val}',
        [OP.ModeEq]: '{val} 模式',
        [OP.RulesetEq]: '{val} 玩法',
        [OP.BanchoBeatmapIdEq]: '在 Bancho 的铺面ID = {val}',
        [OP.BeatmapMd5Eq]: '铺面 MD5 = {val}',
        [OP.StableModIncludeAny]: '开 {val} mod 中的至少一个',
        [OP.StableModIncludeAll]: '开 {val} mod',
        [OP.Extends]: '满足 {val} 的全部条件',
        [OP.OR]: '或',
        [OP.AND]: '以及',
        [OP.NOT]: '不可以',
        [OP.Remark]: 'Remark: {remark} {val}',
        [OP.NoPause]: '无暂停',
      },
    },
  },

} satisfies Record<string, Loc>)

const fmtScore = createScoreFormatter()
const { t, locale } = useI18n({
  messages,
})

const tRoot = localeKey.root
const tMode = tRoot.mode
const tRule = tRoot.ruleset
const tDan = tRoot.dan
const tRequirement = tDan.requirement

const tExp = getPath<Loc>()()
const tCond = tExp.dan.cond

const inline = [
  OP.AccGte,
  OP.ScoreGte,
  OP.ModeEq,
  OP.RulesetEq,
  OP.BanchoBeatmapIdEq,
  OP.BeatmapMd5Eq,
  OP.StableModIncludeAny,
  OP.StableModIncludeAll,
  OP.Extends,
]
const concrete = inline.concat(OP.NoPause)

function isConcreteCond(op: OP): op is ConcreteCondOP | OP.Extends {
  return concrete.includes(op)
}

const $sm = $enum(StableMod).getValues()
function flatMods(mod: StableMod): StableMod[] {
  return $sm.filter(v => v & mod)
}
</script>

<i18n lang="yaml">
zh-CN:
  not-stable-mode-include-any: '开 {val}中的任何mod'
</i18n>

<template>
  <template v-if="isConcreteCond(cond.type)">
    <span v-if="cond.type === OP.NoPause" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      {{ t(tCond[cond.type].__path__) }}
    </span>

    <i18n-t v-else-if="cond.type === OP.ModeEq" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <img
          :alt="cond.val"
          :src="`/icons/mode/${icon.mode[cond.val].icon}.svg`"
          class="inline w-4 h-4 mx-1 mb-1 align-middle color-theme-light-invert"
        >
        <span class="font-bold">{{ t(tMode[cond.val].__path__) }}</span>
      </template>
    </i18n-t>
    <i18n-t v-else-if="cond.type === OP.RulesetEq" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <span class="font-bold">{{ t(tRule[cond.val].__path__) }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.Extends" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <span class="font-bold">{{ t(tRequirement[cond.val].__path__) }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.AccGte" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <span class="font-bold">{{ cond.val }}%</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.ScoreGte" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <span class="font-bold">{{ fmtScore(cond.val) }}</span>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.BanchoBeatmapIdEq" :keypath="tCond[cond.type].__path__" tag="span" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a>
      </template>
    </i18n-t>

    <i18n-t v-else-if="cond.type === OP.BeatmapMd5Eq" tag="span" :keypath="tCond[cond.type].__path__" class="px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content">
      <template #val>
        <a :href="`/b/${cond.val}`" class="link">{{ cond.val }}</a>
      </template>
    </i18n-t>

    <i18n-t
      v-else-if="cond.type === OP.StableModIncludeAny"
      class="inline px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content"
      tag="span"
      :keypath="(parent?.type === OP.NOT && locale === 'zh-CN') ? 'not-stable-mode-include-any' : tCond[cond.type].__path__"
    >
      <template #val>
        <template v-for="(mod, idx) in flatMods(cond.val)" :key="mod">
          <b>
            {{ StableMod[mod] }}{{ idx === flatMods(cond.val).length - 1 ? ' ' : ' / ' }}
          </b>
        </template>
      </template>
    </i18n-t>
    <i18n-t
      v-else-if="cond.type === OP.StableModIncludeAll"
      class="inline px-1 rounded bg-secondary/20 dark:bg-secondary/80text-secondary-content"
      tag="span"
      :keypath="tCond[cond.type].__path__"
    >
      <template #val>
        <template v-for="(mod, idx) in flatMods(cond.val)" :key="mod">
          <b>
            {{ StableMod[mod] }}{{ idx === flatMods(cond.val).length - 1 ? '' : ' ' }}
          </b>
        </template>
      </template>
    </i18n-t>
  </template>
  <template v-else>
    <i18n-t v-if="cond.type === OP.Remark" :keypath="tCond[cond.type].__path__">
      <template #remark>
        <span class="font-semibold">{{ cond.remark }}</span>
      </template>
      <template #val>
        <app-dan-explain-cond :cond="cond.cond" :parent="cond" />
      </template>
    </i18n-t>
    <span v-else-if="cond.type === OP.NOT">
      <span class="badge badge-accent bg-accent/40 dark:bg-accent">{{ t(tCond[cond.type].__path__) }}</span>
      <span>&nbsp;</span>
      <app-dan-explain-cond :cond="cond.cond" :parent="cond" />
    </span>
    <template
      v-else-if="cond.type === OP.AND || cond.type === OP.OR"
    >
      <div
        class="inline-block mt-1 border-l-4" :class="{
          'border-neutral ps-3': cond.type === OP.AND,
          'border-accent/30 bg-accent/5 rounded-r px-3 py-2': cond.type === OP.OR,
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
            >{{ cond.type === OP.AND ? ',' : `${t(tCond[cond.type].__path__)}` }}</span>
            <br v-if="cond.type === OP.AND">
          </template>
        </template>
      </div>
    </template>
  </template>
</template>
