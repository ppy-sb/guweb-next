import { TRPCError } from '@trpc/server'
import { object, string } from 'zod'
import { router as _router } from '../trpc'
import { optionalUserProcedure } from '../middleware/optional-user'
import { ScoreProvider, scores } from '~/server/singleton/service'
import { UserRole } from '~/def/user'

export const router = _router({
  id: optionalUserProcedure
    .input(
      object({
        id: string().trim(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const score = await scores.id(ScoreProvider.stringToScoreId(input.id)).catch(() => raise(TRPCError, { message: 'score not found', code: 'NOT_FOUND' }))

      const transformed = Object.assign(score, {
        id: ScoreProvider.scoreIdToString(score.id),
        beatmap: beatmapIsVisible(score.beatmap)
          ? {
              ...mapId(score.beatmap, ScoreProvider.idToString),
              beatmapset: mapId(score.beatmap.beatmapset, ScoreProvider.idToString),
            }
          : score.beatmap,
      })

      if (!transformed.user.roles.includes(UserRole.Restricted)) {
        return transformed
      }
      if (ctx.user?.roles.includes(UserRole.Staff)) {
        return transformed
      }
      raise(TRPCError, { message: 'user restricted', code: 'NOT_FOUND' })
    }),

})
