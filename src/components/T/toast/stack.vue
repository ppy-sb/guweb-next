<script lang="ts" setup>
import type { Rec } from '~/composables/useToast'

defineProps<{
  expanded?: boolean
  gap?: string
  id: string | number
}>()

const messages = defineModel<Array<Rec>>(
  'messages',
  { default: [] }
)
const _messages = computed(() => messages.value.toReversed())
</script>

<template>
  <input
    :id="`stack${id.toString()}`"
    class="g-stack-expand hidden"
    type="radio"
    name="stack"
  >
  <label for="stack-clear" class="g-stack-dismiss" />

  <TransitionGroup
    tag="label"
    :for="`stack${id.toString()}`"
    name="el-left"
    class="g-stack drop-shadow-2xl"
    :class="{
      expanded,
    }"
    :style="{
      '--stack-gap': gap,
      '--toast-count': messages.length,
    }"
  >
    <div
      v-for="(i, idx) in _messages"
      :key="i.id"
      class="g-stack-item right-0"
    >
      <input
        :id="id.toString() + i.id.toString()"
        class="hidden"
        type="radio"
        :name="id.toString()"
      >
      <label
        :for="id.toString() + i.id.toString()"
        class="alert p-5 relative block shadow-md"
      >
        <div>
          {{ i.message }}
        </div>
        <div class="actions absolute bottom-1 right-1">
          <button
            class="btn btn-sm backdrop-blur-lg btn-ghost shadow-md btn-circle"
            @click="messages.splice(messages.length - idx - 1, 1)"
          >
            <icon
              name="line-md:circle-to-confirm-circle-transition"
              class="w-5 h-5"
            />
          </button>
        </div>
      </label>
    </div>
  </TransitionGroup>
</template>

<style lang="postcss">
label.g-stack-dismiss {
  input.g-stack-expand:checked + & {
    @apply fixed inset-0 z-0;
  }
}
.g-stack-item {
  @apply z-0;
  @apply [&>label>.actions]:invisible;
}

input.g-stack-expand:checked
  + label.g-stack-dismiss
  + .g-stack
  > .g-stack-item {
  @apply [&>label:hover>.actions]:visible;
  @apply [&>input:checked+label>.actions]:visible;
  @apply [&>input:checked+label]:outline;
  @apply [&>input:checked+label]:outline-2;
  @apply [&>input:checked+label]:outline-accent;
}

.g-stack {
  @apply relative isolate z-10 gap-[var(--stack-gap,0em)];
  @apply grid grid-rows-1 transition-all;

  & > .g-stack-item:nth-child(1) {
    @apply z-30;
  }

  & > .g-stack-item:nth-child(2) {
    @apply z-20;
    --offset: 0.465rem;
  }

  & > .g-stack-item:nth-child(3) {
    @apply z-10;
    --offset: 0.875rem;
  }

  /* stacked */
  & {

    /* @apply min-h-[var(--stacked-max-height)]; */
    /* allow for click stack */
    & > * {
      @apply pointer-events-none;
    }

    & > .g-stack-item {
      @apply translate-y-[calc(var(--offset,0))];
      @apply row-start-1 col-start-1;
    }

    & > .g-stack-item {
      transform: scale(85%);
      @apply opacity-0 blur;
    }

    & > .g-stack-item:nth-child(1) {
      @apply scale-100 opacity-100 blur-0;
    }

    & > .g-stack-item:nth-child(2) {
      @apply scale-[95%] opacity-100 blur-[0.5px];
    }

    & > .g-stack-item:nth-child(3) {
      @apply scale-[90%] opacity-100 blur-[1px];
    }

    &,
    & > .g-stack-item {
      @apply transition-all delay-100 duration-[400ms] ease-in-out;
    }
  }

  /* expanded */
  &.expanded,
  input.g-stack-expand:checked + label.g-stack-dismiss + & {

    & > * {
      @apply pointer-events-auto;
    }
    & > .g-stack-item {
      @apply scale-100 opacity-100 blur-none translate-y-0;
      @apply row-start-auto;
      &:not(:nth-child(1)) {
        animation: fade-in 300ms forwards ease-out;
      }
    }

    &,
    & > .g-stack-item {
      @apply transition-all delay-0 duration-150 ease-out;
    }
  }
}

@keyframes fade-in {
  0% {
    @apply opacity-0;
  }
  100% {
    @apply opacity-100;
  }
}
</style>

<style>
.el-left-enter-active {
  animation: g-move-left 0.5s ease both;
}
.el-left-leave-active {
  animation: g-move-right 0.2s ease-in-out both;
}
@keyframes g-move-left {
  from {
    transform: translateX(1em) scaleX(1.0012);
    transform-origin: 0%;
    opacity: 0;
  }
}
@keyframes g-move-right {
  to {
    transform: translateX(1em) scaleX(1.0012);
    transform-origin: 0%;
    opacity: 0;
  }
}
</style>
