import { useSession } from '~/store/session'

export default defineNuxtRouteMiddleware((to) => {
  const { $state } = useSession()
  if (!$state.userId && to.name !== 'auth-login') {
    return {
      name: 'auth-login',
      query: {
        redirect: to.fullPath,
      },
    }
  }
})
