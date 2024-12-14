import type { ChatProvider } from '$base/server'
import { useSession } from '~/store/session'
import { EventType } from '~/def/event'

export const useChatStore = defineStore('chat', () => {
  const $app = useNuxtApp()
  const { push, clear } = useToast()
  const session = useSession()

  const currentEventSource = shallowRef<EventSource>()
  const allMessages = reactive<Map<string, Ctx>>(new Map())

  async function onMessage(message: ChatProvider.IPrivateMessage<string>) {
    const room = message.from.id === session.userId ? message.to.id : message.from.id

    const c = allMessages.get(room) || await initRoom(room)

    if (c.messages.at(-1)?.id !== message.id) {
      c.messages.push(message)
    }

    const online = await $app.$client.user.webOnline.query({ id: room })
    c.online = online

    if (message.read) {
      return
    }
    if (message.from.id === session.userId) {
      return
    }
    push(room, {
      id: message.id,
      message: message.content,
      onClick() {
        // messages.value.set(room, [])
      },
    })
  }

  async function listen(source: EventSource) {
    source.addEventListener(EventType.PrivateMessage, (event) => {
      const json = JSON.parse(event.data) as ChatProvider.IPrivateMessage<string>
      onMessage(json)
    })
  }

  async function read(roomId: string, msg: ChatProvider.IPrivateMessage<string>) {
    msg.read = true
    clear(roomId, msg.id)
  }

  async function initRoom(room: string) {
    const [u, msgs] = [
      await $app.$client.user.byId.query({ id: room }).catch(noop),
      await $app.$client.me.chat.recent.query({ userId: room }),
    ]

    const _room = {
      messages: msgs,
      ava: u?.avatarSrc || '',
      name: u?.name || room,
      online: false,
    }

    allMessages.set(room, _room)
    return _room
  }

  return {
    allMessages,
    onMessage,
    currentEventSource,
    read,
    listen,
    initRoom,
  }
})

interface Ctx {
  messages: ChatProvider.IPrivateMessage<string>[]
  ava: string
  name: string
  description?: string
  online: boolean
}
