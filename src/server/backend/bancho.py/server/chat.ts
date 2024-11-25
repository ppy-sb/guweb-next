import MySQLEvents from '@rodrigogs/mysql-events'
import { and, desc, eq, or } from 'drizzle-orm'
import { type Id } from '..'
import * as schema from '../drizzle/schema'
import { useDrizzle } from './source/drizzle'
import { watchTable } from './event-sources/db'
import { ChatProvider as Base } from '$base/server'

export class ChatProvider extends Base<Id> {
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

  async fetchMessages(from: { id: Id }, to: { id: Id }, opt: { page: number; perPage: number }): Promise<Base.IPrivateMessage<Id>[]> {
    const res = await this.drizzle.query.mail.findMany({
      where: or(
        eq(schema.mail.fromId, from.id),
        eq(schema.mail.toId, to.id)
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
    }))
  }
}
