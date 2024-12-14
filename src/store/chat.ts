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
    if (!allMessages.has(room)) {
      const [u, msgs] = [
        await $app.$client.user.byId.query({ id: room }).catch(noop),
        await $app.$client.me.chat.recent.query({ userId: room }),
      ]

      allMessages.set(room, {
        messages: msgs,
        ava: u?.avatarSrc || '',
        name: u?.name || room,
        online: false,
      })
    }

    const c = allMessages.get(room)
    if (!c) {
      return
    }

    if (c.messages.at(-1)?.id !== message.id) {
      c.messages.push(message)
    }

    const online = await $app.$client.user.webOnline.query({ id: room })
    c.online = online

    push(room, {
      id: message.id,
      message: message.content,
      onClick() {

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

  return {
    allMessages,
    onMessage,
    currentEventSource,
    read,
    listen,
  }
})

interface Ctx {
  messages: ChatProvider.IPrivateMessage<string>[]
  ava: string
  name: string
  description?: string
  online: boolean
}
