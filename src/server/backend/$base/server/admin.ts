import { IdTransformable } from './@extends'
import type { Composition } from './@common'
import type { UserClan, UserCompact, UserOptional, UserSecrets } from '~/def/user'

export abstract class AdminProvider<Id> extends IdTransformable {
  abstract userList(query: Partial<UserCompact<Id> & Pick<UserOptional, 'email' | 'status'>> & Partial<UserSecrets> & Composition.Pagination):
  Promise<
    readonly [
      number,
      Array<
        UserCompact<Id>
        & Pick<UserOptional, 'email' | 'status'>
        & {
          registeredAt: Date
          lastActivityAt: Date
          clan?: UserClan<Id>
        }
      >,
    ]
  >
  abstract userDetail(query: { id: Id }): Promise<UserCompact<Id> & UserOptional>
  abstract updateUserDetail(query: { id: Id }, updateFields: Partial<UserCompact<Id> & UserOptional>): Promise<UserCompact<Id> & UserOptional>
}
