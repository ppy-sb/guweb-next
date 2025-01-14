import MySQLEvents, { type DeleteEvent, type InsertEvent, type UpdateEvent } from '@rodrigogs/mysql-events'
import { type InferSelectModel, eq, inArray } from 'drizzle-orm'
import { BaseDanProcessor } from './$base'
import { type Cond, type DatabaseDan, type DatabaseRequirementCondBinding, type Requirement } from '~/def/dan'
import { type Id } from '~/server/backend/bancho.py'
import * as schema from '~/server/backend/ppy.sb@bancho.py/drizzle/schema'
import { watchTable } from '~/server/backend/bancho.py/server/event-sources/db'

export class CacheSyncedDanProcessor extends BaseDanProcessor {
  watchBindingsDeletion = watchTable(schema.requirementCondBindings, MySQLEvents.STATEMENTS.DELETE, this.onCondBindingDeleted.bind(this))
  watchBindingsInserted = watchTable(schema.requirementCondBindings, MySQLEvents.STATEMENTS.INSERT, this.onCondBindingUpserted.bind(this))
  watchBindingsUpdated = watchTable(schema.requirementCondBindings, MySQLEvents.STATEMENTS.UPDATE, this.onCondBindingUpserted.bind(this))
  watchDanCondChanges = watchTable(schema.danConds, MySQLEvents.STATEMENTS.UPDATE, this.onCondUpdated.bind(this))
  dans = new Map<Id, DatabaseDan<Id, DatabaseRequirementCondBinding<Id, Requirement, Cond>>>()

  async init() {
    this.logger.debug('initializing dan cache')
    await this.dp.drizzle.transaction(async (tx) => {
      const dans = await tx.query.dans.findMany({
        with: {
          requirements: {
            columns: {
              type: true,
              condId: true,
            },
          },
        },
      })

      for (const dan of dans) {
        this.dans.set(dan.id, await this.dp.getDanWithRequirements(dan, tx))
      }
    })

    this.logger.debug(`initialized ${this.dans.size} dan cache(s)`)
  }

  async onCondUpdated(row: UpdateEvent<InferSelectModel<typeof schema.danConds>>) {
    this.logger.debug('detected dan cond update, syncing')
    await this.dp.drizzle.transaction(async (tx) => {
      const condsRoot = this.dp.virtualTableDanTreeSimpleAlias('r')
      const condsAfter = row.affectedRows.map(item => item.after)

      const newDanIds = await tx.selectDistinct({
        id: schema.dans.id,
      })
        .from(schema.dans)
        .innerJoin(schema.requirementCondBindings, eq(schema.requirementCondBindings.danId, schema.dans.id))
        .innerJoin(condsRoot.aliasedTable, eq(condsRoot.column.root, schema.requirementCondBindings.condId))
        .where(
          inArray(condsRoot.column.id, condsAfter.map(item => item.id))
        )

      const dans = await tx.query.dans.findMany({
        where: inArray(schema.dans.id, newDanIds.map(item => item.id)),
        with: {
          requirements: {
            columns: {
              type: true,
              condId: true,
            },
          },
        },
      })

      for (const dan of dans) {
        this.dans.set(dan.id, await this.dp.getDanWithRequirements(dan, tx))
      }
      this.logger.debug(`synced dans: ${dans.map(item => item.id).join(', ')}`)
    })
  }

  onCondBindingDeleted(row: DeleteEvent<InferSelectModel<typeof schema.requirementCondBindings>>) {
    this.logger.debug('detected dan cond delete, removing from cache')
    const deleted = row.affectedRows.map(item => item.before.danId)

    for (const danId of deleted) {
      this.dans.delete(danId)
    }

    this.logger.debug(`removed from cache: ${deleted.join(', ')}`)
  }

  async onCondBindingUpserted(row: InsertEvent<InferSelectModel<typeof schema.requirementCondBindings>> | UpdateEvent<InferSelectModel<typeof schema.requirementCondBindings>>) {
    this.logger.debug('detected dan cond binding upserted, syncing')
    await this.dp.drizzle.transaction(async (tx) => {
      const ids = row.affectedRows.map(item => item.after.danId)
      const dan = await tx.query.dans.findMany({
        where: inArray(schema.dans.id, ids),
        with: {
          requirements: {
            columns: {
              type: true,
              condId: true,
            },
          },
        },
      })

      for (const d of dan) {
        this.dans.set(d.id, await this.dp.getDanWithRequirements(d, tx))
      }

      this.logger.debug(`synced dans: ${dan.map(item => item.id).join(', ')}`)
    })
  }

  async dispose() {
    this.watchBindingsDeletion.dispose()
    this.watchDanCondChanges.dispose()
  }
}
