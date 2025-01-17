import assert from 'node:assert'
import { and, eq, gt, inArray, not } from 'drizzle-orm'
import { type DanProvider } from '..'
import { danSQLChunks } from '../../../utils/sql-dan'
import * as schema from '../../../drizzle/schema'
import { type ScoreId } from '../../../'
import { BanchoPyScoreStatus } from '../../../../bancho.py/enums'
import { CacheSyncedDanProcessor } from './$sync'
import { type Requirement } from '~/def/dan'

// TODO implement
export class IntervalDanProcessor extends CacheSyncedDanProcessor implements CacheSyncedDanProcessor {
  interval?: NodeJS.Timeout
  lastProcessed = 0n
  constructor(dp: DanProvider) {
    super(dp)
  }

  get config() {
    assert(this.dp.config.dan, 'impossible state: IntervalDanProcessor created without config.')
    assert(this.dp.config.dan.processor === 'interval', 'impossible state: IntervalDanProcessor created when processor is not interval.')
    return this.dp.config.dan
  }

  override async init() {
    await super.init()

    const lastProcessed = await this.dp.drizzle.query.requirementClearedScores.findFirst({
      orderBy(tbl, op) {
        return op.desc(tbl.scoreId)
      },
      columns: {
        scoreId: true,
      },
    })
    this.lastProcessed = lastProcessed?.scoreId ?? 0n

    let finished = true
    const _job = async () => {
      if (finished) {
        finished = false
        await this.job()
        finished = true
      }
      else {
        this.logger.debug('interval job already in progress, skipping')
      }
    }
    _job()
    this.interval = setInterval(_job, this.config.interval)
  }

  async job() {
    this.logger.debug('checking for new requirement cleared scores')
    await this.dp.drizzle.transaction(async (tx) => {
      // skip if no new scores
      const latest = await this.getLatestScoreId(tx)
      if ((latest || this.lastProcessed) <= this.lastProcessed) {
        this.logger.debug('no new scores found')
        return
      }

      const results: { scoreId: ScoreId; dan: number; requirement: Requirement }[] = []
      for (const [_, dan] of this.dans) {
        for (const requirement of dan.requirements) {
          try {
            const res = await tx.select({
              scoreId: this.dp.tbl.scores.id,
            })
              .from(this.dp.tbl.scores)
              .innerJoin(this.dp.tbl.beatmaps, eq(this.dp.tbl.scores.mapMd5, this.dp.tbl.beatmaps.md5))
              .innerJoin(this.dp.tbl.users, eq(this.dp.tbl.scores.userId, this.dp.tbl.users.id))
              .where(
                and(
                  gt(this.dp.tbl.scores.id, this.lastProcessed),
                  gt(this.dp.tbl.scores.status, BanchoPyScoreStatus.DNF),
                  danSQLChunks(requirement.cond, dan.requirements, this.dp.tbl),
                  not(
                    inArray(
                      this.dp.tbl.scores.id,
                      this.dp.drizzle
                        .select({ id: schema.requirementClearedScores.scoreId })
                        .from(schema.requirementClearedScores)
                    )
                  )
                )
              )
            results.push(...res.map(item => ({
              scoreId: item.scoreId,
              dan: dan.id,
              requirement: requirement.type,
            })))
          }
          catch (e) {
            console.error(e)
          }
        }
      }

      await this.updateLastProcessed(tx)

      if (!results.length) {
        return
      }
      this.logger.info(`saving ${results.length} new requirement cleared scores`)
      await tx.insert(schema.requirementClearedScores).values(results).onDuplicateKeyUpdate({
        set: {},
      })
    })
  }

  async updateLastProcessed(tx: Omit<typeof this.dp.drizzle, '$client'>) {
    const id = await this.getLatestScoreId(tx)
    if (id) {
      this.lastProcessed = id
    }
  }

  async getLatestScoreId(tx: Omit<typeof this.dp.drizzle, '$client'>) {
    const res = await tx.query.scores.findFirst({
      orderBy(fields, operators) {
        return operators.desc(fields.id)
      },
      columns: {
        id: true,
      },
    })
    return res?.id
  }
}
