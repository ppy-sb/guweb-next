<script setup lang="ts" generic="TVar">
interface IAssignable {
  assign: typeof assign
}

defineProps<{ value: TVar }>()

defineSlots<{
  default(props: { value: TVar } & IAssignable): any
}>()

const m = defineModel<TVar>('value', { required: true })

function assign(value: TVar) {
  m.value = value
}

defineExpose({
  assign,
})
</script>

<template>
  <slot name="default" :value="m" :assign="assign" />
</template>
