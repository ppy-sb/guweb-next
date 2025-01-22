import md5 from 'md5'
import { defineStore } from 'pinia'
import type { UserFull } from '~/def/user'

export const useSession = defineStore('session', {
  state: (): {
    loggedIn: boolean
    userId?: string
    user?: Omit<UserFull<string>, 'statistics'>
    role: {
      admin: boolean
      owner: boolean
      staff: boolean
    }
    events?: EventSource
  } => ({
    loggedIn: false,
    user: undefined,
    userId: undefined,
    role: {
      admin: false,
      owner: false,
      staff: false,
    },
    events: undefined,
  }),
  actions: {
    gotSession() {
      if (!this.user) {
        return
      }
      this.role = computeUserRoles(this.user)
    },
    async login(handle: string, passwordText: string, options: { persist: boolean }) {
      const md5HashedPassword = md5(passwordText)
      return await this.loginHashed(handle, md5HashedPassword, options)
    },
    async loginHashed(handle: string, md5HashedPassword: string, options: { persist: boolean }) {
      const app$ = useNuxtApp()
      const result = await app$.$client.session.login.mutate({
        handle,
        md5HashedPassword,
        persist: options.persist,
      })
      if (!result) {
        return false
      }

      this.loggedIn = true
      this.userId = result.user.id
      this.user = result.user

      this.gotSession()

      return true
    },
    async destroy() {
      const app = useNuxtApp()
      await app.$client.session.destroy.mutate()
      this.closeEventBus()
      await this.retrieve()
    },
    async retrieve() {
      try {
        const app = useNuxtApp()
        const result = await app.$client.session.retrieve.query()
        if (!result.user) {
          this.$reset()
          return false
        }
        this.loggedIn = true
        this.userId = result.user.id
        this.user = result.user

        this.gotSession()

        return true
      }
      catch (err) {
        this.$reset()
        return false
      }
    },
    setAvatarTimestamp() {
      if (!this.user) {
        return
      }

      this.user.avatarSrc = `${this.user.avatarSrc}?${Date.now()}`
    },

    connectEventBus(): EventSource {
      if (!this.events) {
        const { push, clear } = useToast()
        this.events = new EventSource('/api/event/push', { withCredentials: true })
        // push('info', {
        //   id: 'i',
        //   message: 'connected to chat server.',
        // })

        setTimeout(() => clear('info', 'i'), 4500)
      }
      return this.events
    },

    closeEventBus() {
      this.events?.close()
    },
  },

})
