import { GucchoError } from '~/def/messages'
import { maps } from '~/server/singleton/service'

export default defineEventHandler(async (h3Event) => {
  const p = getRouterParams(h3Event)
  const { id } = p

  if (!id || Array.isArray(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: fromGucchoErrorCode(GucchoError.InvalidId),
    })
  }

  const bm = await maps.getBeatmap(id).catch(_ => undefined)

  if (!bm || !beatmapIsVisible(bm)) {
    return createError({
      statusCode: 404,
      statusMessage: fromGucchoErrorCode(GucchoError.BeatmapNotFound),
    })
  }

  await sendRedirect(h3Event, `/beatmapset/${bm.beatmapset.id}?beatmap=${bm.md5}&mode=${bm.mode}`)
})
