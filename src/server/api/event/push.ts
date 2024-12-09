// import { object, record, string, unknown } from 'zod'
import type { Id } from '$active'
import { type ChatProvider as BChat } from '$base/server'
import { assertHaveSession } from '~/server/middleware/0.session'
import { assertLoggedIn } from '~/server/middleware/1.user'
import { assertIsAdmin } from '~/server/middleware/2.admin'
import { chats } from '~/server/singleton/service'

type EventStream = ReturnType<typeof createEventStream>

// const vQ = object({

// })
export default defineEventHandler(async (event) => {
  assertHaveSession(event)
  assertLoggedIn(event)
  assertIsAdmin(event)
  // const q = vQ.parse(await readBody(event))
  const stream = createEventStream(event, { autoclose: true })

  tapChat(event.context.user, stream)

  return stream.send()
})

function tapChat(user: { id: Id }, stream: EventStream) {
  const chatCtx = chats.getOrCreateUserContext(user)

  const listener = (v: BChat.IPrivateMessage<Id>) => {
    stream.push(JSON.stringify(chats.serialize(v)))
  }

  chatCtx.on('privateMessage', listener)
  stream.onClosed(() => {
    chatCtx.off('privateMessage', listener)
    if (chatCtx.listenerCount('privateMessage') === 0) {
      chats.disposeUserContext(user)
    }
  })
}
