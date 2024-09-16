<script setup lang="ts">
defineProps<{
  formatter: (v: number | bigint) => string
}>()
const modelValue = defineModel<number | bigint>()
</script>

<template>
  <input
    v-model="modelValue"
    :class="$attrs.class"
    type="number"
  >
  <div
    :class="$attrs.class"
  >
    {{ formatter(modelValue!) }}
  </div>
</template>

<style lang="postcss">
.masked {
  @apply relative font-mono;
  & > input::-webkit-outer-spin-button,
  & > input::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  > * {
    @apply text-end;
  }
  & > div {
    @apply w-full input-sm absolute inset-0;
    @apply pointer-events-none;
  }
  & > input {
      @apply opacity-0;
    }
  &:has(>input:active), &:has(input:focus) {
    & > div {
      @apply hidden;
    }
    & > input {
      @apply opacity-100;
    }
  }
}
</style>
