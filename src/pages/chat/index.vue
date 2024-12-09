<script setup lang="ts">
import { vElementVisibility } from '@vueuse/components'
import { useChatStore } from '~/store/chat'
import { useSession } from '~/store/session'

const session = useSession()
const { allMessages, read } = useChatStore()

const main = useTemplateRef('messages')

const idxMsg = ref<string>()
const cur = computed(() => allMessages.get(idxMsg.value!))

async function onIdxSelected(id: string) {
  idxMsg.value = id
  await nextTick()
  if (!main.value) {
    return
  }
  main.value.scrollTo({ top: main.value.scrollHeight, behavior: 'auto' })
}

watch(() => cur.value?.messages.length, async () => {
  if (!main.value) {
    return
  }
  await nextTick()
  main.value.scrollTo({ top: main.value.scrollHeight, behavior: 'auto' })
})
</script>

<template>
  <div class="container max-w-screen-xl mx-auto custom-container">
    <div class="flex flex-col md:flex-row h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-25rem)] relative lg:rounded-lg border shadow-md">
      <ul class="overflow-x-auto rounded-none menu menu-horizontal md:menu-vertical bg-base-200 lg:rounded-tl-lg flex-nowrap shrink-0">
        <li v-for="([id, room]) of allMessages" :key="id">
          <a @click="onIdxSelected(id)">
            <img
              class="h-[30px] w-[30px] mask mask-squircle overflow-hidden object-cover aspect-square"
              :src="room.ava"
              :onerror="onLazyImageError"
            >
            {{ room.name }}
            <span class="badge badge-sm badge-warning">{{ room.messages.filter(i => !i.read).length }}</span>
          </a>
        </li>
      </ul>
      <div v-if="idxMsg && cur" class="flex flex-col overflow-y-auto border-l md:grow">
        <div class="flex gap-2 p-4 border-b">
          <div class="w-16 mask mask-squircle">
            <img
              :alt="cur.name"
              :src="cur.ava"
              :onerror="onLazyImageError"
            >
          </div>
          <div class="text-3xl font-semibold">
            {{ cur.name }}
          </div>
        </div>
        <div ref="messages" class="p-4 overflow-y-scroll border-b bg-base-100 grow">
          <template v-for="(message) of cur.messages" :key="message.id">
            <div
              v-element-visibility="(status) => read(idxMsg!, message)" class="chat" :class="[message.from.id === session.userId ? 'chat-end' : 'chat-start']"
            >
              <!-- <div class="chat-image avatar">
                <div class="w-10 rounded-full">
                  <img
                    alt="Tailwind CSS chat bubble component"
                    src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                  >
                </div>
              </div> -->
              <div class="chat-bubble">
                {{ message.content }}
              </div>
            </div>
          </template>
        </div>
        <form action="#" class="join shrink-0" @submit.prevent="noop">
          <textarea id="" name="" class="bg-transparent rounded-none resize-none join-item textarea grow" rows="2" />
          <button class="h-full rounded-none join-item btn btn-accent lg:rounded-br-md">
            send
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
