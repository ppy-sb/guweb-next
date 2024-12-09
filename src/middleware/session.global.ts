import { useSession } from '~/store/session'
import { useChatStore } from '~/store/chat'

export default defineNuxtRouteMiddleware(async () => {
  const session = useSession()
  if (session.loggedIn) {
    return pushService()
  }

  try {
    await session.retrieve()
    pushService()
  }
  catch (error) {
    session.$reset()
  }
})

function pushService() {
  if (import.meta.client) {
    setTimeout(() => {
      const { connect } = useChatStore()
      connect()
    }, 0)
  }
}
