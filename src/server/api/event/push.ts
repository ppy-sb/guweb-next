// import { object, record, string, unknown } from 'zod'
import type { Id } from '$active'
import { type ChatProvider as BChat } from '$base/server'
import { EventType } from '~/def/event'
import { assertHaveSession } from '~/server/middleware/0.session'
import { assertLoggedIn } from '~/server/middleware/1.user'
import { chats } from '~/server/singleton/service'

type EventStream = ReturnType<typeof createEventStream>

// const vQ = object({

// })
export default defineEventHandler(async (event) => {
  assertHaveSession(event)
  assertLoggedIn(event)
  // const q = vQ.parse(await readBody(event))
  const stream = createEventStream(event, { autoclose: true })

  tapChat(event.context.user, stream)

  return stream.send()
})

function tapChat(user: { id: Id }, stream: EventStream) {
  const chatCtx = chats.getOrCreateUserContext(user)

  const listener = (v: BChat.IPrivateMessage<Id>) => {
    const serialized = chats.serialize(v)
    stream.push({
      event: EventType.PrivateMessage,
      id: serialized.id,
      data: JSON.stringify(serialized),
    })
  }

  chatCtx.on(EventType.PrivateMessage, listener)
  stream.onClosed(() => {
    chatCtx.off(EventType.PrivateMessage, listener)
    if (chatCtx.listenerCount(EventType.PrivateMessage) === 0) {
      chats.disposeUserContext(user)
    }
  })
}
