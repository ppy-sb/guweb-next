import type { ChatProvider } from '$base/server'
import { useSession } from '~/store/session'

export const useChatStore = defineStore('chat', () => {
  const $app = useNuxtApp()
  const { push, clear } = useToast()
  const session = useSession()

  const currentEventSource = shallowRef<EventSource>()
  const allMessages = reactive<Map<string, {
    messages: ChatProvider.IPrivateMessage<string>[]
    ava: string
    name: string
    description?: string
  }>>(new Map())

  watch(() => session.loggedIn, () => {
    session.loggedIn ? connect() : close()
  })

  async function onMessage(message: ChatProvider.IPrivateMessage<string>) {
    const room = message.from.id === session.userId ? message.to.id : message.from.id
    if (!allMessages.has(room)) {
      const u = await $app.$client.user.essential.query({ handle: room }).catch(noop)
      allMessages.set(room, {
        messages: await $app.$client.me.recentMessages.query({ userId: room }),
        ava: u?.avatarSrc || '',
        name: u?.name || room,
      })
    }

    const c = allMessages.get(room)!
    if (c.messages.at(-1)?.id !== message.id) {
      c.messages.push(message)
    }

    push(room, {
      id: message.id,
      message: message.content,
      onClick() {

      },
    })
  }

  async function listen(source: EventSource) {
    source.onmessage = (event) => {
      const json = JSON.parse(event.data) as ChatProvider.IPrivateMessage<string>
      onMessage(json)
    }
  }

  async function read(roomId: string, msg: ChatProvider.IPrivateMessage<string>) {
    msg.read = true
    clear(roomId, msg.id)
  }

  function connect(): EventSource {
    if (!currentEventSource.value) {
      currentEventSource.value = new EventSource('/api/event/push', { withCredentials: true })
    }
    listen(currentEventSource.value)
    push('info', {
      id: 'i',
      message: 'connected to chat server.',
    })
    return currentEventSource.value
  }

  async function close() {
    if (currentEventSource.value) {
      currentEventSource.value.close()
    }
    allMessages.clear()
  }

  return {
    allMessages,
    onMessage,
    currentEventSource,
    connect,
    close,
    read,
  }
})
