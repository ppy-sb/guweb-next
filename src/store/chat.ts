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

    const ctx = allMessages.get(room) || await initRoom(room)

    if (ctx.messages.at(-1)?.id !== message.id) {
      ctx.messages.push(message)
    }

    const online = await $app.$client.user.webOnline.query({ id: room })
    ctx.online = online

    if (message.read) {
      return
    }
    if (message.from.id === session.userId) {
      return
    }

    await notifyUser(ctx, message)
  }

  async function notifyUser(ctx: Ctx, message: ChatProvider.IPrivateMessage<string>) {
    const useNative = await notifyMethodSelector()
    if (useNative) {
      const msg = new Notification(ctx.name, {
        body: message.content,
        data: message,
        tag: ctx.id,
        // @ts-expect-error it has.
        renotify: true,
      })

      msg.onclick = () => {
        navigateTo({ name: 'chat', query: { id: ctx.id } })
      }
    }
    else {
      push(ctx.id, {
        id: message.id,
        message: message.content,
        onClick() {
          navigateTo({ name: 'chat', query: { id: ctx.id } })
        },
      })
    }
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
      id: room,
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
  id: string
  messages: ChatProvider.IPrivateMessage<string>[]
  ava: string
  name: string
  description?: string
  online: boolean
}

async function notifyMethodSelector() {
  if (!('Notification' in window)) {
    // Check if the browser supports notifications
    return false
  }
  else if (Notification.permission === 'granted') {
    // Check whether notification permissions have already been granted;
    // if so, create a notification
    return true
    // …
  }
  else if (Notification.permission !== 'denied') {
    // We need to ask the user for permission
    const permission = await Notification.requestPermission()
    // If the user accepts, let's create a notification
    if (permission === 'granted') {
      return true
      // …
    }
  }

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them anymore.
  return false
}
