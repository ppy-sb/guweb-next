import type { UserEssential } from '~/types/user'

export function calcUserPrivilege(user: UserEssential<unknown>) {
  const admin = user.roles.includes('admin')
  const owner = user.roles.includes('owner')
  const staff = user.roles.includes('staff')

  return {
    admin,
    owner,
    staff,
  }
}