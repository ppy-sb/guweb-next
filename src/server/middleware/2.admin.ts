import type { H3Event } from 'h3'
import { loggedIn } from './1.user'
import { haveSession } from './0.session'
import { type UserCompact, UserRole } from '~/def/user'
import type { Session } from '$base/server/session'
import { GucchoError } from '~/def/messages'

export default defineEventHandler(async (event) => {
  sideEffect(event)
})

export function sideEffect(event: H3Event) {
  if (!haveSession(event) || !loggedIn(event)) {
    return
  }
  if (isAdmin(event)) {
    event.context.isAdmin = true
  }
}

export function assertIsAdmin(event: H3Event & { context: { session: Session<any>; user: UserCompact<any> } }): asserts event is typeof event & { context: { user: UserCompact<any> & { roles: [...UserRole[], UserRole.Staff] } } } {
  isAdmin(event) || throwGucchoError(GucchoError.RequireAdminPrivilege)
}

export function isAdmin(event: H3Event & { context: { session: Session<any>; user: UserCompact<any> } }): event is typeof event & { context: { user: UserCompact<any> & { roles: [...UserRole[], UserRole.Staff] } } } {
  return !!event.context.user.roles.includes(UserRole.Staff)
}
