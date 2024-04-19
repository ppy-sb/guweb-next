<script lang="ts" setup>
const messages = ref<Array<{ id: string | number ; message: string }>[]>([[]])

function push(idx: number, msg: string) {
  if (!msg) {
    return
  }
  messages.value[idx].push({
    id: Math.floor(Math.random() * 10000),
    message: msg,
  })
}

function leftPad(value: string, charCount: number, char: string) {
  return char.repeat(charCount - value.length) + value
}
</script>

<template>
  <div class="container custom-container mx-auto">
    <button class="btn" @click="messages.push([])">
      add new stack
    </button>

    <div v-for="(stack, idx) in messages" :key="idx" class="pb-0 m-2 rounded-lg bg-base-200">
      <div class="p-4">
        <pre v-for="item in stack" :key="item.id"><code>({{ leftPad(item.id.toString(), 4, ' ') }}): {{ item.message }}</code></pre>
      </div>
      <form
        action="#" method="post" class="join w-full rounded-t-none" @submit.prevent="(e: Event) => {
          const form = e.target as HTMLFormElement
          const input = form.querySelector('input')

          if (!input) return

          push(idx, input.value || '')
          input.value = ''
        }"
      >
        <input type="text" class="join-item input rounded-t-none grow rounded-lg">
        <button class="join-item btn btn-primary h-auto">
          add notification
        </button>
      </form>
    </div>

    <input id="stack-clear" type="radio" name="stack" class="hidden">
    <div class="absolute top-20 right-6">
      <div class="flex flex-col">
        <template v-for="(_, idx) in messages" :key="idx">
          <t-toast-stack :id="`fuck${idx}`" v-model:messages="messages[idx]" gap="1em" />
          <div v-if="idx !== messages.length - 1" class="my-4" />
        </template>
      </div>
    </div>
  </div>
</template>
