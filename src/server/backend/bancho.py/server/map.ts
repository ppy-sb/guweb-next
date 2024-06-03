import { and, desc, eq, like, or } from 'drizzle-orm'
import * as operators from 'drizzle-orm'
import type { Id } from '..'
import {
  idToString,
  stringToId,
  toBeatmapCompact,
  toBeatmapSource,
  toBeatmapWithBeatmapset, toBeatmapset, toRankingStatus,
} from '../transforms'
import * as schema from '../drizzle/schema'
import { useDrizzle } from './source/drizzle'
import { toBanchoMode } from '~/server/backend/bancho.py/transforms'
import type { Tag } from '~/def/search'
import { type AbnormalStatus, type Beatmapset, RankingStatus } from '~/def/beatmap'
import type { MapProvider as Base } from '$base/server'

const drizzle = useDrizzle(schema)

export class MapProvider implements Base<Id, Id> {
  static readonly idToString = idToString
  static readonly stringToId = stringToId

  drizzle = drizzle

  async getBeatmap(query: string) {
    const queryAsId = stringToId(query)

    const beatmap = await this.drizzle.query.beatmaps.findFirst({
      where: or(
        eq(schema.beatmaps.md5, query),
        Number.isNaN(queryAsId) ? undefined : eq(schema.beatmaps.id, queryAsId),
      ),
      with: {
        source: true,
      },
    }) ?? raise(Error, 'beatmap not found') satisfies typeof schema.beatmaps.$inferSelect & {
      source: typeof schema.sources.$inferSelect
    }

    return toBeatmapWithBeatmapset(beatmap, beatmap.source)
  }

  async getBeatmapset(query: { id: Id }) {
    const { id } = query

    const source = await this.drizzle.query.sources.findFirst({
      where: eq(schema.sources.id, id),
      with: {
        beatmaps: {
          orderBy: (fields, operators) => [
            operators.asc(fields.diff),
            operators.asc(fields.id),
          ],
        },
      },
    }) ?? raise(Error, 'beatmap not found')

    const beatmapset = toBeatmapset(source, source.beatmaps[0])

    return Object.assign(beatmapset, {
      beatmaps: source.beatmaps.map(bm => ({
        ...toBeatmapCompact(bm, toBeatmapSource(source.server)),
        status: toRankingStatus(bm.status) || RankingStatus.NotFound,
      })) as Base.BeatmapsetWithMaps<Id, Id>['beatmaps'],
    }) as Base.BeatmapsetWithMaps<Id, Id>
  }

  private MAP = {
    bpm: 'bpm',
    starRating: 'diff',
    accuracy: 'od',
    circleSize: 'cs',
    approachRate: 'ar',
    hpDrain: 'hp',
    length: 'totalLength',
  } as const satisfies Record<Exclude<Tag[0], 'mode'>, keyof typeof schema.beatmaps>

  createFiltersFromTags(fields: Pick<typeof schema.beatmaps, typeof this.MAP [keyof typeof this.MAP] | 'mode'>, filters: Tag[] = []) {
    const ops: operators.SQL[] = []
    for (const tag of filters ?? []) {
      const [type, op, val] = tag
      const operator = operators[op]
      if (type === 'mode') {
        ops.push(operator(fields.mode, toBanchoMode(val)))
      }
      else {
        const fieldKey = this.MAP[type]
        const field = fields[fieldKey]
        ops.push(operator(field, val))
      }
    }
    return ops
  }

  async searchBeatmap(opt: { keyword: string; limit: number; filters?: Tag[] }) {
    const { keyword, limit, filters } = opt
    const idKw = stringToId(keyword)

    const sql = this.drizzle.query.beatmaps.findMany({

      where: (fields) => {
        return and(
          or(
            like(fields.version, `%${keyword}%`),
            Number.isNaN(idKw) ? undefined : eq(fields.setId, idKw),
          ),
          ...this.createFiltersFromTags(fields, filters)
        )
      },
      with: {
        source: true,
      },

      orderBy: [
        desc(eq(schema.beatmaps.version, keyword)),
        desc(like(schema.beatmaps.version, `${keyword}%`)),
        desc(eq(schema.beatmaps.title, keyword)),
        desc(like(schema.beatmaps.title, `${keyword}%`)),
        desc(eq(schema.beatmaps.artist, keyword)),
        desc(like(schema.beatmaps.artist, `${keyword}%`)),
        desc(schema.beatmaps.setId),
      ],
      limit,
    })

    const result = (await sql)
      .map(i => toBeatmapWithBeatmapset(i, i.source))
      .filter(
        (item): item is typeof item & { status: Exclude<RankingStatus, AbnormalStatus> } =>
          item.status !== RankingStatus.NotFound && item.status !== RankingStatus.Deleted
      )
    return result
  }

  async searchBeatmapset({
    keyword,
    limit,
    filters,
  }: {
    keyword: string
    limit: number
    filters?: Tag[]
  }): Promise<Beatmapset<Id, Id>[]> {
    const idKw = stringToId(keyword)
    const sql = this.drizzle.select({
      id: schema.sources.id,
      server: schema.sources.server,
      meta: {
        title: schema.beatmaps.title,
        artist: schema.beatmaps.artist,
      },
    })
      .from(schema.sources)
      .innerJoin(schema.beatmaps, and(
        eq(schema.beatmaps.setId, schema.sources.id),
        eq(schema.beatmaps.server, schema.sources.server),
      ))
      .where(and(
        or(
          like(schema.beatmaps.version, `%${keyword}%`),
          like(schema.beatmaps.title, `%${keyword}%`),
          like(schema.beatmaps.artist, `%${keyword}%`),
          like(schema.beatmaps.creator, `%${keyword}%`),
          Number.isNaN(idKw) ? undefined : eq(schema.beatmaps.setId, idKw),
        ),
        ...this.createFiltersFromTags(schema.beatmaps, filters)
      ))
      .groupBy(schema.sources.id, schema.sources.server, schema.beatmaps.title, schema.beatmaps.artist)
      .orderBy(
        desc(eq(schema.beatmaps.title, keyword)),
        desc(eq(schema.beatmaps.artist, keyword)),
        desc(like(schema.beatmaps.title, `${keyword}%`)),
        desc(like(schema.beatmaps.artist, `${keyword}%`)),
        desc(schema.sources.id)
      )
      .limit(limit)

    return (await sql).map(bs => toBeatmapset(bs, bs.meta)).filter(TSFilter)
  }
}
