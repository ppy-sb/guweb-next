import { IdTransformable } from './@extends'
import type { Tag } from '~/def/search'
import type { BeatmapWithMeta, Beatmapset, LocalBeatmapCompact, LocalBeatmapset, RankingStatus, ReferencedBeatmapCompact, ReferencedBeatmapset } from '~/def/beatmap'

export namespace MapProvider {
  export interface IdQuery<Id> {
    id: Id
  }

  export type BeatmapsetWithMaps<Id, ForiengId> =
  | (
    ReferencedBeatmapset<Id, ForiengId> &
    {
      beatmaps: Array<ReferencedBeatmapCompact<Id, ForiengId> & { status: RankingStatus }>
      status: RankingStatus
    }
  )
  | (
    LocalBeatmapset<Id> &
    {
      beatmaps: Array<LocalBeatmapCompact<Id> & { status: RankingStatus }>
      status: RankingStatus
    }
  )

  export type BeatmapWithBeamapset<Id, ForeignId> =
  | ReferencedBeatmapCompact<Id, ForeignId> & { beatmapset: ReferencedBeatmapset<Id, ForeignId> }
  | LocalBeatmapCompact<Id> & { beatmapset: LocalBeatmapset<Id> }
}
export abstract class MapProvider<Id, ForeignId> extends IdTransformable {
  abstract getBeatmapset(query: MapProvider.IdQuery<Id>): Promise<MapProvider.BeatmapsetWithMaps<Id, ForeignId>>
  abstract getBeatmap(
    query: string
  ): Promise<BeatmapWithMeta<
    RankingStatus,
    Id,
    ForeignId
  >>
  abstract searchBeatmap(opt: { keyword: string; limit: number; filters?: Tag[] }): Promise<
   MapProvider.BeatmapWithBeamapset<Id, ForeignId>[]
  >
  abstract searchBeatmapset(opt: {
    keyword: string
    limit: number
    filters?: Tag[]
  }): Promise<Beatmapset<Id, ForeignId>[]>
}
