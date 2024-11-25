// import { object, record, string, unknown } from 'zod'
import type { ChatProvider } from '../../backend/$base/server'
import { assertHaveSession } from '../../middleware/0.session'
import { assertLoggedIn } from '../../middleware/1.user'
import { assertIsAdmin } from '../../middleware/2.admin'
import { chats } from '../../singleton/service'
import type { Id } from '$active'

// const vQ = object({

// })
export default defineEventHandler(async (event) => {
  assertHaveSession(event)
  assertLoggedIn(event)
  assertIsAdmin(event)
  // const q = vQ.parse(await readBody(event))
  const stream = createEventStream(event, { autoclose: true })

  const ctx = chats.getOrCreateUserContext(event.context.user)

  const listener = (v: ChatProvider.IPrivateMessage<Id>) => {
    stream.push(JSON.stringify(v))
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
