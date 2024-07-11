<script setup lang="ts">
import { $enum } from 'ts-enum-util'
import { StableMod } from '../../../def/score'
import {
  type Cond,
  OP,
  type UConcreteCond,
} from '~/def/dan'

withDefaults(defineProps<{ listMode: boolean }>(), { listMode: false })

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const cond = defineModel<Cond>()

const ops = $enum(OP).getValues()

const inline = [
  OP.AccGte,
  OP.ScoreGte,
  OP.ModeEq,
  OP.BanchoBeatmapIdEq,
  OP.BeatmapMd5Eq,
  OP.Extends,
  OP.WithStableMod,
  OP.Extends,
]
const concrete = inline.concat(OP.NoPause)

// const isInline = computed(() => inline.includes(cond.value?.op as OP))

function isConcreteCond(op: OP): op is UConcreteCond['op'] {
  return concrete.includes(op)
}
function selectCond() {
  if (!cond.value) {
    return
  }
  if (cond.value.op === OP.AND || cond.value.op === OP.OR) {
    cond.value.cond = []
  }
}
</script>

<template>
  <div
    class="col-span-4 grid grid-cols-4 bg-gbase-500/10 border-gbase-500/20 border rounded-xl p-2 gap-2"
  >
    <template v-if="cond">
      <select
        v-model="cond.op"
        name="cond"
        class="select select-sm"
        @change="selectCond"
      >
        <option disabled value="">
          select
        </option>
        <option v-for="op in ops" :key="op" :value="op">
          {{ OP[op] }}
        </option>
      </select>
      <template v-if="isConcreteCond(cond.op) && cond.op !== OP.NoPause">
        <div v-if="cond.op === OP.WithStableMod" class="col-span-4 grid grid-cols-4 gap-x-6">
          <div v-for="mod in $enum(StableMod).getValues()" :key="mod" class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">{{ StableMod[mod] }}</span>
              <input type="checkbox" :checked="!!((cond.val as number) & mod)" class="checkbox" @change="(cond.val = (cond.val as number) ^ mod)">
            </label>
          </div>
        </div>
        <input
          v-else
          v-model="cond.val"
          :type="(cond.op === OP.AccGte || cond.op === OP.ScoreGte) ? 'number' : 'text'"
          class="input input-sm col-span-3"
        >
      </template>
      <template v-else>
        <div v-if="cond.op !== undefined" class="ps-3 py-2 ms-3 border-l-4 border-gbase-500 grid grid-cols-4 col-span-4 gap-2">
          <div v-if="cond.op === OP.Remark" class="form-control col-span-4">
            <label for="remark" class="label">Remark:</label>
            <input name="remark" type="text" class="input input-sm input-info">
          </div>
          <app-dan-cond v-if="cond.op === OP.Remark || cond.op === OP.NOT" v-model="cond.cond" @delete="cond = undefined" />

          <div v-if="cond.op === OP.AND || cond.op === OP.OR" class="col-span-4 space-y-2">
            <app-dan-cond v-for="(_, i) in cond.cond" :key="i" v-model="cond.cond[i]" :list-mode="true" @delete="(cond.cond as Cond[]).splice(i, 1)" />
            <button class="btn btn-sm btn-success" @click="(cond.cond as any).push({})">
              add
            </button>
          </div>
        </div>
      </template>
      <button class="btn btn-sm btn-danger" @click="cond = undefined">
        reset
      </button>
      <button v-if="listMode" class="btn btn-sm btn-danger" @click="emit('delete')">
        delete
      </button>
    </template>
    <template v-else>
      <button class="btn btn-sm" @click="cond = {}">
        setup cond
      </button>
    </template>
  </div>
</template>

<style scoped></style>
