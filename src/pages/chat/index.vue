<script setup lang="ts">
import useToast from '~/composables/useToast'
import type { ChatProvider } from '$base/server'

const $app = useNuxtApp()
const { push } = useToast()

const allMessages = reactive<Map<string, ChatProvider.IPrivateMessage<string>[]>>(new Map())

onBeforeMount(() => {
  const source = new EventSource('/api/chat/push')
  source.onmessage = (event) => {
    const json = JSON.parse(event.data) as ChatProvider.IPrivateMessage<string>
    onMessage(json)
  }
})

async function onMessage(message: ChatProvider.IPrivateMessage<string>) {
  if (!allMessages.has(message.from.id)) {
    allMessages.set(message.from.id, await $app.$client.me.recentMessages.query({ userId: message.from.id }))
  }

  const ctx = allMessages.get(message.from.id)!
  if (ctx.at(-1)?.id !== message.id) {
    ctx.push(message)
  }
  push(message.from.id, {
    id: message.id,
    message: message.content,
    onClick() {

    },
  })
}
</script>

<template>
  <div>
    <div v-for="([id, messages]) of allMessages" :key="id">
      <div v-for="message of messages" :key="message.id">
        <div>
          {{ message.from.id }}: {{ message.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
