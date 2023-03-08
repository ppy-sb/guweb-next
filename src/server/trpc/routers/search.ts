import { idToString } from '$active'
import { z } from 'zod'
import { MapProvider, UserProvider } from '~/adapters/ppy.sb@bancho.py/server'

import { publicProcedure as p, router as _router } from '../trpc'

const map = new MapProvider()
const user = new UserProvider()

const replaceId = <T extends { id: Parameters<typeof idToString>[number] }>(
  bs: T,
) => ({
    ...bs,
    id: idToString(bs.id),
  })

export const router = _router({
  searchUser: p
    .input(
      z.object({
        keyword: z.string(),
        limit: z.number().optional().default(10),
      }),
    )
    .query(async ({ input: { keyword, limit } }) => {
      const users = await user.search({
        keyword,
        limit,
      })

      return users.map(replaceId)
    }),
  searchBeatmap: p
    .input(
      z.object({
        keyword: z.string(),
        limit: z.number().optional().default(5),
      }),
    )
    .query(async ({ input: { keyword, limit } }) => {
      const beatmaps = await map.searchBeatmap({
        keyword,
        limit,
      })

      return beatmaps.map(replaceId)
    }),
  searchBeatmapset: p
    .input(
      z.object({
        keyword: z.string(),
        limit: z.number().optional().default(5),
      }),
    )
    .query(async ({ input: { keyword, limit } }) => {
      const beatmapsets = await map.searchBeatmapset({
        keyword,
        limit,
      })

      return beatmapsets.map(replaceId)
    }),
})
