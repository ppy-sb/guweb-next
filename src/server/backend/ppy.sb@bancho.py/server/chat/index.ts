import type { Id } from '../../'
import { chatNotify } from '../api-client'
import { config } from '../../env'
import type { ChatProvider as Base } from '$base/server'
import { ChatProvider as BPYChat } from '~/server/backend/bancho.py/server'

export class ChatProvider extends BPYChat implements Base<Id> {
  config = config()
  async send($: { from: { id: Id }; to: { id: Id }; content: string }) {
    const _res = await super.send($)
    await chatNotify($.to.id, this.config).catch()
    return _res
  }
}
