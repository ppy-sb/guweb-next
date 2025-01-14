import { useSession } from '~/store/session'

export default defineNuxtRouteMiddleware(() => {
  const { $state } = useSession()
  if (!$state.role.admin) {
    return navigateTo({
      name: 'article-id',
      params: {
        id: ['403'],
      },
    })
  }
})
