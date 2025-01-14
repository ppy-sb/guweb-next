<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import draggable from 'vuedraggable'
import { StableMod } from '~/def/score'
import {
  type Cond,
  OP,
  Requirement,
  type RequirementCondBinding,
  type WrappedCond,
} from '~/def/dan'
import { modes, rulesets } from '~/def'

withDefaults(defineProps<{
  listMode?: boolean
  disabled?: boolean
  requirements: readonly RequirementCondBinding<Requirement, Cond>[]
  current: RequirementCondBinding<Requirement, Cond>
}>(), { listMode: false, disabled: false })

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const tRequirement = localeKey.root.dan.requirement

const cond = defineModel<Cond>()

interface Translation {
  dan: {
    cond: Record<OP, string>
    requirement: Record<Requirement, string>
  }
}

// TODO fr-FR
// TODO de-DE
const { t } = useI18n({
  messages: {
    'en-GB': {
      dan: {
        requirement: {
          [Requirement.Pass]: 'Pass',
          [Requirement.NoPause]: 'No Pause',
        },
        cond: {
          [OP.AccGte]: 'Accuracy ≥',
          [OP.ScoreGte]: 'Score ≥',
          [OP.ModeEq]: 'Mode =',
          [OP.RulesetEq]: 'Rule =',
          [OP.BanchoBeatmapIdEq]: 'Bancho bid =',
          [OP.BeatmapMd5Eq]: 'Beatmap MD5 =',
          [OP.StableModIncludeAny]: 'Played with any Mod',
          [OP.StableModIncludeAll]: 'Played with all Mod',
          [OP.Extends]: 'meet all requirements in',
          [OP.OR]: 'or',
          [OP.AND]: 'and',
          [OP.NOT]: 'not',
          [OP.Remark]: 'Remark',
          [OP.NoPause]: 'No Pause',
        },
      },
    },
    'zh-CN': {
      dan: {
        requirement: {
          [Requirement.Pass]: 'Pass',
          [Requirement.NoPause]: '无暂停',
        },
        cond: {
          [OP.AccGte]: 'ACC ≥',
          [OP.ScoreGte]: '分数 ≥',
          [OP.ModeEq]: '模式 =',
          [OP.RulesetEq]: '玩法 =',
          [OP.BanchoBeatmapIdEq]: 'Bancho 的 bid =',
          [OP.BeatmapMd5Eq]: 'Beatmap MD5 =',
          [OP.StableModIncludeAny]: '至少加一个 Mod',
          [OP.StableModIncludeAll]: '加全部 Mod',
          [OP.Extends]: '符合另一判定的所有条件',
          [OP.OR]: '满足其中一项',
          [OP.AND]: '满足所有条件',
          [OP.NOT]: '不是',
          [OP.Remark]: '备注',
          [OP.NoPause]: '无暂停',
        },
      },
    },
  } satisfies Record<string, Translation>,
})

const drag = ref(false)

const ops = Object.values(OP)

const concrete = [
  OP.AccGte,
  OP.ScoreGte,
  OP.ModeEq,
  OP.RulesetEq,
  OP.BanchoBeatmapIdEq,
  OP.BeatmapMd5Eq,
  OP.StableModIncludeAny,
  OP.StableModIncludeAll,
  OP.Extends,
  OP.NoPause,
] as const

function isConcreteCond(op: OP): op is typeof concrete[number] {
  return concrete.includes(op as any)
}
function selectCond() {
  if (!cond.value) {
    return
  }

  if (cond.value.type === OP.AND || cond.value.type === OP.OR) {
    cond.value.cond = []
  }

  if (cond.value.type === OP.NOT) {
    if (Array.isArray(cond.value.cond)) {
      cond.value.cond = {
        type: OP.AND,
        cond: cond.value.cond,
      }
    }
  }
}
function resetCond() {
  cond.value = undefined
}

async function initCond(op: OP) {
  cond.value = {
    type: op,
  } as Cond
  await nextTick()
  selectCond()
}
</script>

<i18n lang="yaml">
en-GB:
  reset: Reset
  delete: Delete
  select: Select
  add: Add

zh-CN:
  reset: 重置
  delete: 删除
  select: 选择
  add: 添加
</i18n>

<template>
  <div
    class="grid grid-cols-12 col-span-12 gap-2 p-2 border-l-4 rounded-r shadow-inner bg-base-200 shadow-gbase-500/35 ms-2 border-gbase-500/40"
  >
    <template v-if="cond?.type">
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="form-control">
          <select
            v-model="cond.type"
            :disabled="disabled"
            name="cond"
            class="select select-sm"
            @change="selectCond"
          >
            <option disabled value="">
              {{ t('select') }}
            </option>
            <option v-for="op in ops" :key="op" :value="op">
              {{ t(`dan.cond.${op}`) }}
            </option>
          </select>
        </div>
      </div>
      <template v-if="cond.type === OP.NoPause">
        <div class="hidden sm:block sm:col-span-4 md:col-span-7" />
        <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
          {{ t('delete') }} <icon name="material-symbols:delete" />
        </button>
        <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
          {{ t('reset') }} <icon name="lsicon:clear-filled" />
        </button>
      </template>
      <template v-else-if="isConcreteCond(cond.type)">
        <template v-if="[OP.ModeEq, OP.RulesetEq, OP.Extends].includes(cond.type)">
          <div v-if="cond.type === OP.ModeEq" class="col-span-6 md:col-span-3 form-control">
            <select
              v-model="cond.val"
              :disabled="disabled"
              name="mode"
              class="select select-sm"
              @change="selectCond"
            >
              <option disabled value="">
                {{ t('select') }}
              </option>
              <option v-for="m in modes" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
          </div>
          <div v-else-if="cond.type === OP.RulesetEq" class="col-span-6 md:col-span-3 form-control">
            <select
              v-model="cond.val"
              :disabled="disabled"
              name="mode"
              class="select select-sm"
              @change="selectCond"
            >
              <option disabled value="">
                {{ t('select') }}
              </option>
              <option v-for="r in rulesets" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>

          <div v-else-if="cond.type === OP.Extends" class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
            <select
              v-model="cond.val"
              :disabled="disabled"
              name="mode"
              class="select select-sm"
              @change="selectCond"
            >
              <option disabled value="">
                {{ t('select') }}
              </option>
              <option
                v-for="ach in Object.values(Requirement).filter(ach => requirements.some(r => r.type === ach) && ach !== current.type)"
                :key="ach"
                :value="ach"
              >
                {{ t(tRequirement[ach].__path__) }}
              </option>
            </select>
          </div>

          <div class="hidden md:block md:col-span-4" />

          <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
            {{ t('delete') }} <icon name="material-symbols:delete" />
          </button>
          <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
            {{ t('reset') }} <icon name="lsicon:clear-filled" />
          </button>
        </template>
        <template v-else-if="cond.type === OP.StableModIncludeAny || cond.type === OP.StableModIncludeAll">
          <div class="hidden sm:block sm:col-span-4 md:col-span-7" />
          <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
            {{ t('delete') }} <icon name="material-symbols:delete" />
          </button>
          <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
            {{ t('reset') }} <icon name="lsicon:clear-filled" />
          </button>
          <div class="grid grid-cols-12 col-span-12 gap-0 gap-x-6">
            <div v-for="mod in $enum(StableMod).getValues()" :key="mod" class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
              <label class="cursor-pointer label">
                <span class="label-text">{{ StableMod[mod] }}</span>
                <input :disabled="disabled" type="checkbox" :checked="!!((cond.val as number) & mod)" class="checkbox" @change="(cond.val = (cond.val as number) ^ mod)">
              </label>
            </div>
          </div>
        </template>
        <template v-else>
          <input
            v-model="cond.val"
            class="input input-sm"
            :disabled="disabled"
            :class="cond.type === OP.AccGte || cond.type === OP.ScoreGte ? 'col-span-6 md:col-span-3' : 'col-span-12 md:col-span-7'"
            :type="cond.type === OP.AccGte || cond.type === OP.ScoreGte ? 'number' : 'text'"
          >
          <div
            class="hidden"
            :class="{
              'md:block md:col-span-4': cond.type === OP.AccGte || cond.type === OP.ScoreGte,
            }"
          />
          <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
            {{ t('delete') }} <icon name="material-symbols:delete" />
          </button>
          <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
            {{ t('reset') }} <icon name="lsicon:clear-filled" />
          </button>
        </template>
      </template>
      <template v-else-if="cond.type !== undefined">
        <div class="hidden sm:block sm:col-span-4 md:col-span-7" />
        <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
          {{ t('delete') }} <icon name="material-symbols:delete" />
        </button>
        <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
          {{ t('reset') }} <icon name="lsicon:clear-filled" />
        </button>
        <div class="grid grid-cols-12 col-span-12 gap-2">
          <app-dan-cond
            v-if="cond.type === OP.Remark || cond.type === OP.NOT"
            v-model="cond.cond"
            :requirements
            :current
            @delete="cond = undefined"
          />
          <draggable
            v-else-if="cond.type === OP.AND || cond.type === OP.OR" v-model="cond.cond as unknown[]"
            class="grid grid-cols-12 col-span-12 space-y-2"
            v-bind="{
              animation: 200,
              group: 'description',
              disabled: false,
              ghostClass: 'ghost',
            }"
            :item-key="(i?: WrappedCond<OP, Cond>) => i?.cond || 'n'"
            @start="drag = true"
            @end="drag = false"
          >
            <template #item="{ index }">
              <app-dan-cond
                v-model="cond.cond[index]"
                :list-mode="true"
                :requirements
                :current
                @delete="(cond.cond as Cond[]).splice(index, 1)"
              />
            </template>
            <template #footer>
              <button class="col-span-12 btn btn-sm btn-success btn-outline" @click="(cond.cond as any).push(undefined)">
                {{ t('add') }}
                <icon name="material-symbols:add-rounded" />
              </button>
            </template>
          </draggable>
        </div>
      </template>
    </template>
    <template v-else>
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="form-control">
          <select
            value=""
            :disabled="disabled"
            name="cond"
            class="select select-sm"
            @change="v => initCond((v.target as any).value)"
          >
            <option disabled value="">
              {{ t('select') }}
            </option>
            <option v-for="op in ops" :key="op" :value="op">
              {{ t(`dan.cond.${op}`) }}
            </option>
          </select>
        </div>
      </div>
      <div class="hidden sm:block sm:col-span-4 md:col-span-7" />
      <button v-if="listMode" :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-error btn-outline" @click="emit('delete')">
        {{ t('delete') }} <icon name="material-symbols:delete" />
      </button>
      <button v-else :disabled="disabled" class="col-span-6 sm:col-span-2 btn btn-sm btn-neutral btn-outline" @click="resetCond()">
        {{ t('reset') }} <icon name="lsicon:clear-filled" />
      </button>
    </template>
  </div>
</template>

<style scoped lang="postcss">
.ghost {
  @apply blur opacity-35;
}
</style>
