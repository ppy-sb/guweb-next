import MySQLEvents from '@rodrigogs/mysql-events'
import { and, desc, eq, or } from 'drizzle-orm'
import { type Id } from '..'
import * as schema from '../drizzle/schema'
import { idToString, stringToId } from '../transforms'
import { useDrizzle } from './source/drizzle'
import { watchTable } from './event-sources/db'
import { ChatProvider as Base } from '$base/server'

export class ChatProvider extends Base<Id> implements Base<Id> {
  static readonly stringToId = stringToId
  static readonly idToString = idToString
  drizzle = useDrizzle(schema)

  listener = watchTable(schema.mail, MySQLEvents.STATEMENTS.INSERT, (event) => {
    switch (event.type) {
      case MySQLEvents.STATEMENTS.INSERT:
        for (const row of event.affectedRows) {
          this.onPrivateMessage({ from: { id: row.after.fromId }, to: { id: row.after.toId }, content: row.after.msg, id: row.after.id, timestamp: row.after.time!, read: row.after.read })
        }
        break
      default:
        assertNotReachable()
    }
  })

  async send($: { from: { id: Id }; to: { id: Id }; content: string }) {
    const { from, to, content } = $
    await this.drizzle.insert(schema.mail).values({
      fromId: from.id,
      toId: to.id,
      msg: content,
    })
  }

  async getMessagesBetween(user1: { id: Id }, user2: { id: Id }, opt: { page: number; perPage: number }): Promise<Base.IPrivateMessage<Id>[]> {
    const res = await this.drizzle.query.mail.findMany({
      where: or(
        and(eq(schema.mail.fromId, user1.id), eq(schema.mail.toId, user2.id)),
        and(eq(schema.mail.fromId, user2.id), eq(schema.mail.toId, user1.id)),
      ),
      orderBy: desc(schema.mail.id),
      limit: opt.perPage,
      offset: opt.page * opt.perPage,
    })

    return res.map(i => ({
      from: { id: i.fromId },
      to: { id: i.toId },
      content: i.msg,
      id: i.id,
      timestamp: i.time!,
      read: i.read,
    })).reverse()
  }
}
