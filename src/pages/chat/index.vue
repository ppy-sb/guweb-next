<script setup lang="ts">
import { vElementVisibility } from '@vueuse/components'
import { useDebounceFn } from '@vueuse/core'
import { useChatStore } from '~/store/chat'
import { useSession } from '~/store/session'

// eslint-disable-next-line antfu/no-const-enum
const enum ModalState {
  Idle,
  Loading,
}

const session = useSession()
const { allMessages, read, initRoom } = useChatStore()
const app = useNuxtApp()

const main = useTemplateRef('messages')
const modal = useTemplateRef('modal')
const modalState = ref(ModalState.Idle)

const idxMsg = ref<string>()
const cur = computed(() => allMessages.get(idxMsg.value!))
const message = ref('')

const friends = ref<{ id: string; name: string; avatarSrc?: string; safeName: string }[]>(await searchUser())

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

async function send() {
  if (!idxMsg.value) {
    return
  }
  await app.$client.me.chat.send.mutate({
    to: idxMsg.value,
    message: message.value,
  })
  message.value = ''
}
async function createRoom(user: { id: string }) {
  modalState.value = ModalState.Loading
  await initRoom(user.id)
  await onIdxSelected(user.id)
  await nextTick()
  modalState.value = ModalState.Idle
}

async function searchUser(keyword?: string) {
  return keyword ? await app.$client.search.searchUser.query({ keyword }) : await app.$client.me.relations.query()
}

async function _onInputHandle(kw: string) {
  friends.value = await searchUser(kw)
}
const onInputHandle = useDebounceFn(_onInputHandle, 300)
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
            <span class="badge badge-sm badge-warning css-counter" :counter="room.messages.filter(i => !i.read).length" />
          </a>
        </li>
        <li class="md:mt-auto">
          <a class="flex justify-center h-full" @click="modal?.showModal()">
            <icon name="material-symbols:add-comment-outline" class="w-5 h-5 opacity-60" />
          </a>
        </li>
      </ul>
      <div v-if="idxMsg && cur" class="flex flex-col overflow-y-auto border-l grow">
        <div class="flex gap-2 p-4 border-b">
          <div class="w-16 mask mask-squircle">
            <img
              :alt="cur.name"
              :src="cur.ava"
              :onerror="onLazyImageError"
            >
          </div>
          <div>
            <div class="text-3xl font-semibold">
              {{ cur.name }}
            </div>

            <div
              class="badge badge-outline" :class="{
                'badge-success': cur.online,
                'badge-neutral': !cur.online,
              }"
            >
              <template v-if="cur.online">
                {{ 'web online' }}
              </template>
              <template v-else>
                {{ 'offline' }}
              </template>
            </div>
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
              <div class="shadow-sm chat-bubble">
                {{ message.content }}
              </div>
            </div>
          </template>
        </div>
        <form action="#" class="join shrink-0" @submit.prevent="noop">
          <textarea id="" v-model="message" name="" class="bg-transparent rounded-none resize-none join-item textarea grow" rows="2" />
          <button class="h-full rounded-none join-item btn btn-accent lg:rounded-br-md" @click="send">
            send
          </button>
        </form>
      </div>
    </div>
  </div>
  <TResponsiveModal
    ref="modal"
    v-slot="{ closeModal }"
    class="my-auto w-full"
    :class="{
      'pointer-events-none': modalState === ModalState.Loading,
    }"
  >
    <div class="p-4 bg-base-200 rounded-2xl relative min-w-full md:min-w-1/2 mx-auto h-full">
      <div
        class="flex flex-col max-h-full"
        :class="{
          'blur-lg': modalState === ModalState.Loading,
        }"
      >
        <div class="card-title mb-2 shrink-0">
          User
        </div>
        <div class="shrink-0 mt-4 md:mt-0 md:mb-4 relative order-2 md:order-1">
          <div class="absolute inset-y-0 flex items-center pointer-events-none start-0 ps-3">
            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input
            id="keyword"
            name="keyword"
            type="search"
            class="block w-full p-4 text-sm text-gray-900 border border-gray-300 rounded-lg ps-10 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search User"
            @input="(v: Event) => onInputHandle((v as any).target.value)"
          >
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 grow overflow-y-auto rounded-xl order-1">
          <button
            v-for="user of friends" :key="`relation-@${user.safeName}`"
            class="p-2 user-list-item bg-base-100 rounded-lg active:bg-base-300 active:scale-[0.98] transition-all duration-[25ms] ease-out"
            @click="createRoom(user).then(() => closeModal())"
          >
            <div class="flex items-center justify-center gap-2 md:justify-start face pointer-events-none">
              <div class="relative z-10 mask mask-squircle hoverable">
                <img :alt="user.name" :src="user.avatarSrc" class="pointer-events-none w-14 md:w-[4em]" :error="onLazyImageError">
              </div>
              <div class="grow">
                <h1 class="text-lg text-left">
                  {{ user.name }}
                </h1>
                <div class="flex justify-between w-full items-top">
                  <div class="text-left g-link-style">
                    @{{ user.safeName }}
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
      <div
        class="absolute inset-0 opacity-0 pointer-events-none transition-opacity"
        :class="{
          'opacity-100 pointer-events-auto': modalState === ModalState.Loading,
        }"
      >
        <div class="h-full w-full flex items-center justify-center">
          <span class="loading w-10 h-10" />
        </div>
      </div>
    </div>
  </TResponsiveModal>
</template>

<style scoped lang="postcss">
.user-list-item {
  @apply border-b-2 border-gbase-500/30 active:border-t-2 active:border-b-0;
}
.css-counter  {
  &::before {
    content: attr(counter);
  }
  &[counter='0'] {
    display: none;
  }
}
</style>
