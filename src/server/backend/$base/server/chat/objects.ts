/**
 * user start listen to events
 * create context for user
 *
 * user send message -> save to db
 * msg event came from db -> broadcast?
 *
 * for private messages do I put two users in one private channel or two private channels?
 */

import EventEmitter from 'node:events'
import type { ChatProvider } from '.'

export class UserChatContext<Id> extends EventEmitter {
  constructor(readonly me: { id: Id }) {
    super()
  }

  onPrivateMessage($: ChatProvider.IPrivateMessage<Id>) {
    this.emit('privateMessage', $)
  }

  dispose() {
    this.removeAllListeners()
  }
}

// interface IMessenger<Id> {
//   onNewMessage(sender: { id: Id }, content: string): void
// }

// export class Channel<Id> implements IMessenger<Id> {
//   constructor(readonly ctx: UserChatContext<Id>, readonly id: Id, readonly name: string, readonly description: string) {}

//   onNewMessage(sender: { id: Id }, content: string) {}
// }

// export class PrivateChat<Id> implements IMessenger<Id> {
//   constructor(readonly ctx: UserChatContext<Id>, readonly target: { id: Id }) {}

//   onNewMessage(sender: { id: Id }, content: string) {
//   }
// }

// export class Chats<Id> {
//   private channels: Map<Id, Channel<Id>> = new Map()
//   private privateMessages: Map<Id, PrivateMessage<Id>> = new Map()
// }
