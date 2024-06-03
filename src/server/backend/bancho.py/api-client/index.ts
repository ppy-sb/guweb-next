import type { BanchoPyMode, BanchoPyRankedStatus, BanchoPyStatusWithBeatmap, BanchoPyUserStatus } from '../enums'
import { fromBanchoPyMode, fromBanchoPyUserStatus } from '../transforms'
import { BeatmapSource } from '~/def/beatmap'
import { UserStatus } from '~/def/user'

interface GulagStatusBeatmap {
  md5: string
  id: number
  set_id: number
  artist: string
  title: string
  version: string
  creator: string
  last_update: number
  total_length: number
  max_combo: number
  status: BanchoPyRankedStatus
  plays: number
  passes: number
  mode: BanchoPyMode
  bpm: number
  cs: number
  od: number
  ar: number
  hp: number
  diff: number
}

type LiveUserStatus =
  | {
    status: 200
    statusText: string
    ok: true
    json: () => Promise<
      | {
        status: 'success'
        player_status: {
          online: true
          login_time: number
          status: {
            action: Exclude<BanchoPyUserStatus, BanchoPyStatusWithBeatmap> // int(player.status.UserStatus),
            info_text: string // player.status.info_text,
            mode: BanchoPyMode // int(player.status.mode),
            mods: number // int(player.status.mods),
          }
        }
      }
      | {
        status: 'success'
        player_status: {
          online: true
          login_time: number
          status: {
            action: BanchoPyStatusWithBeatmap // int(player.status.UserStatus),
            info_text: string // player.status.info_text,
            mode: BanchoPyMode // int(player.status.mode),
            mods: number // int(player.status.mods),
            beatmap: GulagStatusBeatmap
          }
        }
      }
      | {
        status: 'success'
        player_status: {
          online: false
          last_seen: number
        }
      }>
  }
  | {
    ok: false
    status: 404
    statusText: string
    json: () => Promise<{ status: 'Player not found.' }>
  }
  | {
    ok: false
    status: 400
    statusText: string
    json: () => Promise<{ status: 'Must provide either id OR name!' }>
  }

function createFetch(endpoint: string) {
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1)
  }
  return (resource: string | URL, options?: RequestInit & { params?: Record<string, string | number> }) => {
    const url = new URL (endpoint + resource)
    if (options?.params) {
      for (const key of Object.keys(options.params)) {
        url.searchParams.append(key, options.params[key].toString())
      }
    }
    return fetch(url, options)
  }
}

export async function getLiveUserStatus({ id }: { id: number }, config: { api: { v1: string } }) {
  const fetch = createFetch(config.api.v1)
  const result = await fetch('/get_player_status', {
    method: 'get',
    params: {
      id,
    },
  }) as LiveUserStatus
  if (!result.ok) {
    throw new Error(result.statusText)
  }
  const value = await result.json()
  const s = value.player_status

  if (!s.online) {
    return {
      status: UserStatus.Offline,
      lastSeen: new Date(s.last_seen * 1000),
    } as const
  }
  const [mode, ruleset] = fromBanchoPyMode(s.status.mode)
  const base = {
    description: s.status.info_text,
    status: fromBanchoPyUserStatus(s.status.action) as Exclude<UserStatus, UserStatus.Offline>,
    mode,
    ruleset,
    beatmap: undefined,
  } as const
  if (!('beatmap' in s.status)) {
    return base
  }
  const bm = s.status.beatmap
  return {
    ...base,
    beatmap: {
      id: bm.id,
      foreignId: bm.id,
      md5: bm.md5,
      version: bm.version,
      creator: bm.creator,
      beatmapset: {
        id: bm.set_id,
        foreignId: bm.set_id,
        meta: {
          intl: {
            artist: bm.artist,
            title: bm.title,
          },
        },
        source: BeatmapSource.Bancho,
      },
    },
  } as const
}
