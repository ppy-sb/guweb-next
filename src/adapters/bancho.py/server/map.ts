import {
  createFilter,
  idToString,

  stringToId,
  toBeatmapEssential,
  toBeatmapWithBeatmapset, toBeatmapset, toRankingStatus,
} from '../transforms'
import type { Id } from '..'
import { getPrismaClient } from './prisma'
import type { Tag } from '~/types/search'

import { TSFilter } from '~/utils'
import type { MapProvider as Base } from '~/adapters/base/server'
import type { BeatmapSource, Beatmapset } from '~/types/beatmap'

export class MapProvider implements Base<Id> {
  static idToString = idToString
  static stringToId = stringToId
  db = getPrismaClient()

  async getBeatmap(query: { id: Id }) {
    const { id } = query
    const beatmap = await this.db.map.findFirstOrThrow({
      where: {
        id,
      },
      include: {
        source: true,
      },
    })
    return toBeatmapWithBeatmapset(beatmap)
  }

  async getBeatmapset(query: { id: Id }) {
    const { id } = query
    const source = await this.db.source.findFirstOrThrow({
      where: {
        id,
      },
    })
    // if (!source) {
    //   throw new TRPCError({
    //     message: `unable to find beatmap source: ${id}`,
    //     code: 'NOT_FOUND',
    //   })
    // }
    const beatmaps = await this.db.map.findMany({
      where: {
        source: {
          id,
        },
      },
      orderBy: {
        diff: 'asc',
      },
    })
    const beatmapset = toBeatmapset(source, beatmaps[0])

    return Object.assign(beatmapset, {
      beatmaps: beatmaps.map(bm => ({
        ...toBeatmapEssential(bm),
        status: toRankingStatus(bm.status) || 'notFound',
      })),
    })
  }

  async searchBeatmap(opt: { keyword: string; limit: number; filters?: Tag[] }) {
    const { keyword, limit, filters } = opt
    const idKw = stringToId(keyword)
    const result = await this.db.map.findMany({
      take: limit,
      where: {
        AND: [
          {
            OR: [
              isNaN(idKw)
                ? undefined
                : {
                    setId: idKw,
                  },
              {
                version: {
                  contains: keyword,
                },
              },
            ].filter(TSFilter),
          },
          ...(filters ? createFilter(filters) : []),
        ],
      },
      include: {
        source: true,
      },
      orderBy: [
        {
          setId: 'desc',
        },
      ],
    })
    return result.map(toBeatmapWithBeatmapset).filter(TSFilter)
  }

  async searchBeatmapset({
    keyword,
    limit,
    filters,
  }: {
    keyword: string
    limit: number
    filters?: Tag[]
  }): Promise<Beatmapset<BeatmapSource, number, unknown>[]> {
    const idKw = stringToId(keyword)
    const bs = await this.db.source.findMany({
      take: limit,
      where: {
        AND: [
          isNaN(idKw)
            ? undefined
            : {
                id: idKw,
              },
          {
            beatmaps: {
              some: {
                AND: [
                  isNaN(idKw)
                    ? {
                        OR: [
                          {
                            title: {
                              contains: keyword,
                            },
                          },
                          {
                            artist: {
                              contains: keyword,
                            },
                          },
                          {
                            creator: {
                              contains: keyword,
                            },
                          },
                        ],
                      }
                    : undefined,
                  ...(filters ? createFilter(filters) : []),
                ].filter(TSFilter),
              },
            },
          },
        ].filter(TSFilter),
      },
      include: {
        beatmaps: true,
      },
      orderBy: [
        {
          id: 'desc',
        },
      ],
    })
    return bs.map(bs => bs.beatmaps.length ? toBeatmapset(bs, bs.beatmaps[0]) : undefined).filter(TSFilter)
  }
}
