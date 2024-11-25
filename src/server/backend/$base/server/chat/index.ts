import { UserChatContext } from './objects'

export abstract class ChatProvider<Id> {
  contexts: Map<Id, UserChatContext<Id>> = new Map()
  getOrCreateUserContext(user: { id: Id }) {
    if (this.contexts.has(user.id)) {
      return this.contexts.get(user.id)!
    }
    const ctx = new UserChatContext<Id>(user)
    this.contexts.set(user.id, ctx)
    return ctx
  }

  async disposeUserContext(user: { id: Id }) {
    const ctx = this.contexts.get(user.id)
    this.contexts.delete(user.id)
    if (!ctx) {
      return
    }

    ctx.dispose()
  }

  abstract send($: { from: { id: Id }; to: { id: Id }; content: string }): Promise<void>

  onPrivateMessage($: { from: { id: Id }; to: { id: Id }; content: string; id: Id; timestamp: number }) {
    const { from, to, content, id, timestamp } = $
    const contexts = [this.contexts.get(from.id), this.contexts.get(to.id)]
    for (const ctx of contexts) {
      if (!ctx) {
        continue
      }

      ctx.onPrivateMessage({ from, to, content, id, timestamp })
    }
  }

  abstract fetchMessages(from: { id: Id }, to: { id: Id }, opt: { page: number; perPage: number }): Promise<ChatProvider.IPrivateMessage<Id>[]>
}

export namespace ChatProvider {
  export interface IPrivateMessage<Id> {
    id: Id
    from: { id: Id }
    to: { id: Id }

    content: string
    timestamp: number
  }
}
