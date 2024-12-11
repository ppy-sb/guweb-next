import { IdTransformable } from '../@extends'
import { UserEventContext } from '../event'

export abstract class ChatProvider<Id> extends IdTransformable {
  contexts: Map<Id, UserEventContext<Id>> = new Map()
  getOrCreateUserContext(user: { id: Id }) {
    if (this.contexts.has(user.id)) {
      return this.contexts.get(user.id)!
    }
    const ctx = new UserEventContext<Id>(user)
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

  abstract send($: ChatProvider.IPrivateMessage<Id>): Promise<void>

  onPrivateMessage($: ChatProvider.IPrivateMessage<Id>) {
    const { from, to, content, id, timestamp } = $
    const contexts = [this.contexts.get(from.id), this.contexts.get(to.id)]
    for (const ctx of contexts) {
      if (!ctx) {
        continue
      }

      ctx.onPrivateMessage({ from, to, content, id, timestamp, read: false })
    }
  }

  abstract getMessagesBetween(from: { id: Id }, to: { id: Id }, opt: { page: number; perPage: number }): Promise<ChatProvider.IPrivateMessage<Id>[]>

  serialize<T>(i: ChatProvider.IPrivateMessage<T>): ChatProvider.IPrivateMessage<string> {
    const _c = (this.constructor as unknown as typeof ChatProvider<T>)

    return ({
      id: _c.idToString(i.id),
      from: mapId(i.from, _c.idToString),
      to: mapId(i.to, _c.idToString),
      content: i.content,
      timestamp: i.timestamp,
      read: i.read,
    })
  }
}

export namespace ChatProvider {
  export interface IPrivateMessage<Id> extends IMessage<Id> {
    from: { id: Id }
    to: { id: Id }
  }

  export interface IMessage<Id> {
    id: Id
    content: string
    read: boolean
    timestamp: number
  }
}
