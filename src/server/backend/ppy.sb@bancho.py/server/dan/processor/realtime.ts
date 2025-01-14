import MySQLEvents, { type RowEvent } from '@rodrigogs/mysql-events'
import { type InferSelectModel, inArray } from 'drizzle-orm'
import { CacheSyncedDanProcessor } from './$sync'
import * as schema from '~/server/backend/ppy.sb@bancho.py/drizzle/schema'
import { type Id } from '~/server/backend/ppy.sb@bancho.py'
import { fromBanchoPyMode, toScore } from '~/server/backend/bancho.py/transforms'
import { watchTable } from '~/server/backend/bancho.py/server/event-sources/db'
import { run_usecase as run_dan } from '~/common/utils/dan'
import { type AbnormalStatus, type NormalBeatmapWithMeta, RankingStatus } from '~/def/beatmap'

export class RealtimeDanProcessor extends CacheSyncedDanProcessor implements CacheSyncedDanProcessor {
  watchScores = watchTable(schema.scores, MySQLEvents.STATEMENTS.ALL, this.onScoreSubmitted.bind(this))

  async onScoreSubmitted(row: RowEvent<InferSelectModel<typeof schema.scores>>) {
    this.logger.debug('detected score submit')
    // const deletedScore = row.affectedRows.map(item => !item.after ? item.before : undefined).filter(item => item !== undefined)
    const insertedScore = row.affectedRows.map(item => !item.before ? item.after : undefined).filter(item => item !== undefined)
    const updatedScore = row.affectedRows.map(item => item.before && item.after ? item.after : undefined).filter(item => item !== undefined)

    const beatmaps = await this.dp.drizzle.query.beatmaps.findMany({
      where: inArray(schema.beatmaps.md5, insertedScore.concat(updatedScore).map(item => item.mapMd5)),
      with: {
        source: true,
      },
    })
    const users = await this.dp.drizzle.query.users.findMany({
      where: inArray(schema.users.id, insertedScore.map(item => item.userId)),
    })

    for (const [_, dan] of this.dans) {
      for (const score of insertedScore) {
        const bm = beatmaps.find(item => item.md5 === score.mapMd5)
        const [mode, ruleset] = fromBanchoPyMode(score.mode)
        if (!bm) {
          continue
        }

        const tScore = toScore({ score, beatmap: bm, mode, ruleset, source: bm.source })
        const beatmap = tScore.beatmap

        if (beatmap.status === RankingStatus.Deleted || beatmap.status === RankingStatus.NotFound) {
          continue
        }

        const result = run_dan(dan, {
          ...tScore,
          beatmap: beatmap as NormalBeatmapWithMeta<Exclude<RankingStatus, AbnormalStatus>, Id, Id>,
          nonstop: false,
          player: users.find(item => item.id === score.userId)!,
        })

        const passed = result.map((item, idx) => [item, dan.requirements[idx]] as const).filter(([item]) => item.result)
        if (!passed.length) {
          continue
        }

        await this.dp.drizzle.insert(schema.requirementClearedScores).values(passed.map(([_item, requirement]) => ({
          scoreId: score.id,
          dan: dan.id,
          requirement: requirement.type,
        })))
      }
    }
  }

  async dispose() {
    this.watchScores.dispose()
  }
}
