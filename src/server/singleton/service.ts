import {
  AdminProvider,
  ArticleProvider,
  ClanProvider,
  FileProvider,
  LogProvider,
  MailProvider,
  MailTokenProvider,
  MapProvider,
  MonitorProvider,
  RankProvider,
  ScoreProvider,
  SessionProvider,
  UserProvider,
  UserRelationProvider,
} from '$active/server'

import { type Id, type ScoreId } from '$active'

import {
  type AdminProvider as BaseAdminProvider,
  type ArticleProvider as BaseArticleProvider,
  type ClanProvider as BaseClanProvider,
  type FileProvider as BaseFileProvider,
  type MailProvider as BaseMailProvider,
  type MailTokenProvider as BaseMailTokenProvider,
  type MapProvider as BaseMapProvider,
  type MonitorProvider as BaseMonitorProvider,
  type RankProvider as BaseRankProvider,
  type ScoreProvider as BaseScoreProvider,
  type UserProvider as BaseUserProvider,
  type UserRelationProvider as BaseUserRelationProvider,
} from '$base/server'

export const articles: BaseArticleProvider = new ArticleProvider()
export const admin: BaseAdminProvider<Id> = new AdminProvider()
export const files: BaseFileProvider<Id, ScoreId> = new FileProvider()
export const logs = new LogProvider()
export const maps: BaseMapProvider<Id, Id> = new MapProvider()
export const monitor: BaseMonitorProvider = new MonitorProvider()
export const ranks: BaseRankProvider<Id> = new RankProvider()
export const scores: BaseScoreProvider<ScoreId, Id> = new ScoreProvider()
export const sessions = new SessionProvider()
export const users: BaseUserProvider<Id, ScoreId> = new UserProvider()
export const userRelations: BaseUserRelationProvider<Id> = new UserRelationProvider()
export const clanProvider: BaseClanProvider<Id> = new ClanProvider()
export const mail: BaseMailProvider = new MailProvider()
export const mailToken: BaseMailTokenProvider = new MailTokenProvider()

export {
  AdminProvider,
  ArticleProvider,
  ClanProvider,
  FileProvider,
  LogProvider,
  MailTokenProvider,
  MapProvider,
  MonitorProvider,
  RankProvider,
  ScoreProvider,
  SessionProvider,
  UserProvider,
  UserRelationProvider,
} from '$active/server'
