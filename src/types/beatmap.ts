export type UnknownSource = 'unknown'
export type LocalSource = 'local'
export type ForeignSource = 'bancho' | 'private-server'
export type BeatmapSource = LocalSource | ForeignSource | UnknownSource

// https://osu.ppy.sh/docs/index.html#beatmapsetcompact-rank-status
export const RankingStatusEnum = {
  graveyard: -2,
  WIP: -1,
  pending: 0,
  ranked: 1,
  approved: 2,
  qualified: 3,
  loved: 4,
  deleted: 5,
} as const

export type RankingStatus = keyof typeof RankingStatusEnum

export interface BeatmapSet<Source extends BeatmapSource, LocalId, ForeignId> {
  source: Source
  id: Source extends UnknownSource ? never : LocalId

  foreignId: Source extends ForeignSource ? ForeignId : never
  meta: {
    // unicode
    artist?: string
    title?: string

    // (Probably) ASCII Based
    intl: {
      artist: string
      title: string
    }
  }
}

export interface Beatmap<
  Source extends BeatmapSource,
  Status extends RankingStatus,
  LocalId,
  ForeignId,
> {
  id: [Source, Status] extends [UnknownSource, 'deleted']
    ? never
    : LocalId

  // id: Source extends UnknownSource
  //   ? Status extends RankingStatusEnum.deleted
  //     ? never
  //     : LocalId
  //   : LocalId;

  foreignId: Source extends ForeignSource ? ForeignId : never

  // setId: Source extends UnknownSource ? never : LocalId

  // foreignSetId: Source extends ForeignSource ? ForeignId : never

  status: Status

  properties: {
    bpm: number
    // CS
    circleSize: number
    // AR
    approachRate: number
    // OD
    accuracy: number
    // HP
    hpDrain: number

    count: {
      circles: number
      sliders: number
      spinners: number
    }
  }
  md5: string
  beatmapSet: BeatmapSet<Source, LocalId, ForeignId>
}
