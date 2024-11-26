<script lang="ts" setup>
import useToast from '../composables/useToast'

const { messages, push } = useToast()
function leftPad(value: string, charCount: number, char: string) {
  return char.repeat(charCount - value.length) + value
}
</script>

<template>
  <div class="container custom-container mx-auto">
    <button class="btn" @click="messages.set(Math.random(), [])">
      add new stack
    </button>

    <div v-for="[id, stack] in messages" :key="id" class="pb-0 m-2 rounded-lg bg-base-200">
      <div class="p-4">
        <pre v-for="item in stack" :key="item.id"><code>({{ leftPad(item.id.toString(), 4, ' ') }}): {{ item.message }}</code></pre>
      </div>
      <form
        action="#" method="post" class="join w-full rounded-t-none" @submit.prevent="(e: Event) => {
          const form = e.target as HTMLFormElement
          const input = form.querySelector('input')

          if (!input) return

          push(id, { id: Math.round(Math.random() * 10000).toString(), message: input.value || '' })
          input.value = ''
        }"
      >
        <input type="text" class="join-item input rounded-t-none grow rounded-lg">
        <button class="join-item btn btn-primary h-auto">
          add notification
        </button>
      </form>
    </div>
  </div>
</template>
