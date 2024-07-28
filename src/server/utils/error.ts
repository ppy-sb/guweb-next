import { TRPCError } from '@trpc/server'
import { GucchoError } from '~/def/messages'

export function throwGucchoError(code: GucchoError): never {
  throw createGucchoError(code)
}

function mergeGucchoMsg<C extends GucchoError, T extends object>(code: C, merge: T) {
  return {
    message: fromGucchoErrorCode(code),
    ...merge,
  }
}
export function createGucchoError(code: GucchoError): TRPCError {
  const merge = mergeGucchoMsg.bind(null, code) as <T extends object>(merge: T) => T & { message: `G:${typeof code}` }
  switch (code) {
    case GucchoError.YouNeedToLogin:
    case GucchoError.RequireAdminPrivilege:
    case GucchoError.OldPasswordMismatch:
    case GucchoError.IncorrectPassword:
    case GucchoError.InsufficientPrivilegeToEditArticle:
    {
      return new TRPCError(merge({ code: 'UNAUTHORIZED' }))
    }

    case GucchoError.MissingServerAvatarConfig:
    {
      return new TRPCError(merge({ code: 'NOT_IMPLEMENTED' }))
    }

    case GucchoError.MimeNotImage:
    {
      return new TRPCError({ code: 'UNPROCESSABLE_CONTENT' })
    }

    case GucchoError.DeletingMoreThanOneAvatars:
    case GucchoError.EmptyPassword:
    case GucchoError.InvalidId:
    case GucchoError.HackerTryingToDeleteAllAvatars:
    case GucchoError.FileSystemArticlePathOutsideArticleRoot:
    case GucchoError.TryingToDeleteFallbackContents:
    {
      return new TRPCError(merge({ code: 'BAD_REQUEST' }))
    }

    case GucchoError.ProhibitedRelationWithSelf:
    case GucchoError.ConflictRelation:
    case GucchoError.ConflictEmail:
    case GucchoError.PasswordNotMatch:
    case GucchoError.UserExists:
    {
      return new TRPCError(merge({ code: 'CONFLICT' }))
    }

    case GucchoError.ModeNotSupported:
    case GucchoError.ModeOrRulesetNotSupported:
    case GucchoError.EmailTokenNotFound:
    case GucchoError.RelationNotFound:
    case GucchoError.SessionNotFound:
    case GucchoError.UserNotFound:
    case GucchoError.BeatmapNotFound:
    case GucchoError.AtLeastOneUserNotExists:
    case GucchoError.ScoreNotFound:
    case GucchoError.ClanNotFound:
    case GucchoError.ArticleNotFound:
    case GucchoError.DanNotFound:
    {
      return new TRPCError(merge({ code: 'NOT_FOUND' }))
    }

    case GucchoError.UnableToRefreshSession:
    case GucchoError.UnableToRetrieveSession:
    case GucchoError.UnableToUpdateSession:
    case GucchoError.UnknownError:
    case GucchoError.UpdateUserSettingsFailed:
    case GucchoError.UpdateUserpageFailed:
    case GucchoError.RegistrationFailed:
    case GucchoError.CannotSaveDan:
    {
      return new TRPCError(merge({ code: 'INTERNAL_SERVER_ERROR' }))
    }

    case GucchoError.AssertionError: {
      return assertNotReachable()
    }
    default: {
      assertNotReachable(code)
    }
  }
}
