import {
  AdminProvider as BAdminProvider,
  ArticleProvider as BArticleProvider,
  ChatProvider as BChatProvider,
  ClanProvider as BClanProvider,
  MailProvider as BEmailProvider,
  FileProvider as BFileProvider,
  LogProvider as BLogProvider,
  MailTokenProvider as BMailTokenProvider,
  MapProvider as BMapProvider,
  MonitorProvider as BMonitorProvider,
  RankProvider as BRankProvider,
  ScoreProvider as BScoreProvider,
  SessionProvider as BSessionProvider,
  UserRelationProvider as BUserRelationProvider,
} from '~/server/backend/bancho.py/server'

export { UserProvider } from './user'

export class AdminProvider extends BAdminProvider {}
export class ArticleProvider extends BArticleProvider {}
export class ChatProvider extends BChatProvider {}
export class ClanProvider extends BClanProvider {}
export class FileProvider extends BFileProvider {}
export class LogProvider extends BLogProvider {}
export class MapProvider extends BMapProvider {}
export class MonitorProvider extends BMonitorProvider {}
export class RankProvider extends BRankProvider {}
export class ScoreProvider extends BScoreProvider {}
export class SessionProvider extends BSessionProvider {}
export class UserRelationProvider extends BUserRelationProvider {}
export class MailProvider extends BEmailProvider {}

export class MailTokenProvider extends BMailTokenProvider {}
