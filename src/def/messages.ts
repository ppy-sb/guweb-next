export enum GucchoError {
  UnknownError = -1,
  AssertionError,
  MissingServerAvatarConfig,

  // basic
  ModeNotSupported = 1000,
  ModeOrRulesetNotSupported,
  InvalidId,

  // user
  UserNotFound = 2000,
  UserExists,
  ConflictEmail,
  EmptyPassword,
  UpdateUserSettingsFailed,
  UpdateUserpageFailed,
  MimeNotImage,
  HackerTryingToDeleteAllAvatars,
  DeletingMoreThanOneAvatars,
  RegistrationFailed,

  // auth
  IncorrectPassword = 3000,
  PasswordNotMatch,
  OldPasswordMismatch,
  EmailTokenNotFound,

  // relation
  RelationNotFound = 4000,
  ProhibitedRelationWithSelf,
  ConflictRelation,
  AtLeastOneUserNotExists,

  // session
  UnableToRetrieveSession = 5000,
  UnableToRefreshSession,
  UnableToUpdateSession,
  YouNeedToLogin,
  SessionNotFound,

  // admin
  RequireAdminPrivilege = 6000,

  // beatmap
  BeatmapNotFound = 7000,

  // score
  ScoreNotFound = 8000,
  // clan
  ClanNotFound = 9000,

  // article
  ArticleNotFound = 10000,
  InsufficientPrivilegeToEditArticle,
  FileSystemArticlePathOutsideArticleRoot,
  TryingToDeleteFallbackContents,

  // Dan
  DanNotFound = 11000,
  CannotSaveDan,
}
