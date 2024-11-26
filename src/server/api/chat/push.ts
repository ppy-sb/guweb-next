// import { object, record, string, unknown } from 'zod'
import type { Id } from '$active'
import { type ChatProvider as BChat } from '$base/server'
import { assertHaveSession } from '~/server/middleware/0.session'
import { assertLoggedIn } from '~/server/middleware/1.user'
import { assertIsAdmin } from '~/server/middleware/2.admin'
import { ChatProvider, chats } from '~/server/singleton/service'

// const vQ = object({

// })
export default defineEventHandler(async (event) => {
  assertHaveSession(event)
  assertLoggedIn(event)
  assertIsAdmin(event)
  // const q = vQ.parse(await readBody(event))
  const stream = createEventStream(event, { autoclose: true })

  const ctx = chats.getOrCreateUserContext(event.context.user)

  const listener = (v: BChat.IPrivateMessage<Id>) => {
    stream.push(JSON.stringify(chats.serializeIPrivateMessageIds(v, ChatProvider)))
  }

  ctx.on('privateMessage', listener)
  stream.onClosed(() => {
    ctx.off('privateMessage', listener)
    if (ctx.listenerCount('privateMessage') === 0) {
      chats.disposeUserContext(event.context.user)
    }
  })
  return stream.send()
})
