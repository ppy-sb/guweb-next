import EventEmitter from 'node:events'
import type { ChatProvider } from '../chat'
import { EventType } from '~/def/event'

export class UserEventContext<Id> extends EventEmitter {
  constructor(readonly me: { id: Id }) {
    super()
  }

  onPrivateMessage($: ChatProvider.IPrivateMessage<Id>) {
    this.emit(EventType.PrivateMessage, $)
  }

  dispose() {
    this.removeAllListeners()
  }
}
