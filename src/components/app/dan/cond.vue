<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import draggable from 'vuedraggable'
import { StableMod } from '~/def/score'
import {
  type ConcreteCondOP,
  type Cond,
  OP,
  Requirement,
} from '~/def/dan'
import { modes } from '~/def'

withDefaults(defineProps<{
  listMode?: boolean
  disabled?: boolean
}>(), { listMode: false, disabled: false })

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const _op = $enum(OP)
const $requirement = $enum(Requirement)
const drag = ref(false)

const cond = defineModel<Cond>()

const ops = $enum(OP).getValues()

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

// const isInline = computed(() => inline.includes(cond.value?.op as OP))

function isConcreteCond(op: OP): op is ConcreteCondOP | OP.Extends {
  return concrete.includes(op)
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
</script>

<template>
  <div
    class="grid grid-cols-12 col-span-12 gap-2 p-2 border-l-4 rounded shadow-inner shadow-gbase-500/35 bg-base-300/40 ms-2 border-gbase-500/50"
  >
    <template v-if="cond">
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
              select
            </option>
            <option v-for="op in ops" :key="op" :value="op">
              {{ _op.getKeyOrDefault(op, '?') }}
            </option>
          </select>
        </div>
      </div>
      <template v-if="cond.type === OP.NoPause">
        <div class="hidden sm:block col-span-12 sm:col-span-6 md:col-span-3" />
      </template>
      <template v-else-if="isConcreteCond(cond.type)">
        <div v-if="cond.type === OP.ModeEq" class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
          <select
            v-model="cond.val"
            :disabled="disabled"
            name="mode"
            class="select select-sm"
            @change="selectCond"
          >
            <option disabled value="">
              select
            </option>
            <option v-for="m in modes" :key="m" :value="m">
              {{ m }}
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
              select
            </option>
            <option v-for="ach in $requirement.getValues()" :key="ach" :value="ach">
              {{ $requirement.getKeyOrDefault(ach, '?') }}
            </option>
          </select>
        </div>
        <div v-else-if="cond.type === OP.WithStableMod" class="grid grid-cols-12 col-span-12 gap-0 gap-x-6">
          <div v-for="mod in $enum(StableMod).getValues()" :key="mod" class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
            <label class="cursor-pointer label">
              <span class="label-text">{{ StableMod[mod] }}</span>
              <input :disabled="disabled" type="checkbox" :checked="!!((cond.val as number) & mod)" class="checkbox" @change="(cond.val = (cond.val as number) ^ mod)">
            </label>
          </div>
        </div>

        <input
          v-else
          v-model="cond.val"
          :disabled="disabled"
          :type="(cond.type === OP.AccGte || cond.type === OP.ScoreGte) ? 'number' : 'text'"
          class="col-span-12 sm:col-span-6 md:col-span-3 input input-sm"
          :class="{
            'col-span-12 md:col-span-9': cond.type !== OP.AccGte && cond.type !== OP.ScoreGte,
          }"
        >
      </template>
      <template v-else>
        <div v-if="cond.type !== undefined" class="grid grid-cols-12 col-span-12 gap-2 ">
          <div v-if="cond.type === OP.Remark" class="w-full col-span-12">
            <label for="remark" class="label">Remark:</label>
            <input :disabled="disabled" name="remark" type="text" class="input input-sm input-info">
          </div>
          <app-dan-cond v-if="cond.type === OP.Remark || cond.type === OP.NOT" v-model="cond.cond" @delete="cond = undefined" />
          <draggable
            v-else-if="cond.type === OP.AND || cond.type === OP.OR" v-model="cond.cond as unknown[]"
            class="grid grid-cols-12 col-span-12 space-y-2"
            v-bind="{
              animation: 200,
              group: 'description',
              disabled: false,
              ghostClass: 'ghost',
            }"
            item-key="op"
            @start="drag = true"
            @end="drag = false"
          >
            <template #item="{ index }">
              <app-dan-cond v-model="cond.cond[index]" :list-mode="true" @delete="(cond.cond as Cond[]).splice(index, 1)" />
            </template>
            <template #footer>
              <button class="col-span-12 btn btn-sm btn-success" @click="(cond.cond as any).push({})">
                add
              </button>
            </template>
          </draggable>
        </div>
      </template>
      <button :disabled="disabled" class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-sm btn-secondary" @click="cond = undefined">
        reset
      </button>
      <button v-if="listMode" :disabled="disabled" class="col-span-12 sm:col-span-6 md:col-span-3 btn btn-sm btn-warning" @click="emit('delete')">
        delete
      </button>
    </template>
    <template v-else>
      <div class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
        <button :disabled="disabled" class=" btn btn-sm" @click="cond = {} as any">
          init
        </button>
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3 form-control">
        <button v-if="listMode" :disabled="disabled" class="btn btn-sm btn-warning" @click="emit('delete')">
          delete
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ghost {
  @apply blur-sm brightness-125 opacity-20
}
</style>
