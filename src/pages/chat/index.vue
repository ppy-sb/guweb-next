<script setup lang="ts">
import type { ChatProvider } from '$base/server'

const allMessages = reactive<Map<string, ChatProvider.IPrivateMessage<string>[]>>(new Map())

onBeforeMount(() => {
  const source = new EventSource('/api/chat/push')
  source.onmessage = (event) => {
    const json = JSON.parse(event.data) as ChatProvider.IPrivateMessage<string>
    onMessage(json)
  }
})

function onMessage(message: ChatProvider.IPrivateMessage<string>) {
  if (!allMessages.has(message.from.id)) {
    allMessages.set(message.from.id, [])
  }

  allMessages.get(message.from.id)!.push(message)
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
