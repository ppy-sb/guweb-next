import { array, nativeEnum, number, object, string, tuple } from 'zod'
import { zodHandle, zodMode, zodRuleset } from '../../shapes'
import { router as log } from './log'
import { UserProvider, admin } from '~/server/singleton/service'
import { staffProcedure } from '~/server/trpc/middleware/role'
import { router as _router } from '~/server/trpc/trpc'
import { UserRole } from '~/def/user'
import { CountryCode } from '~/def/country-code'

const searchParam = object({
  id: string().trim(),
  name: string().trim(),
  safeName: string().trim(),
  email: string().email(),
  flag: nativeEnum(CountryCode),
  registeredFrom: string().datetime(),
  registeredTo: string().datetime(),
  latestActivityFrom: string().datetime(),
  latestActivityTo: string().datetime(),
  roles: array(nativeEnum(UserRole)),
})
  .partial()
  .and(
    object({
      perPage: number().default(10),
      page: number().default(0),
    })
  )

export const router = _router({
  log,
  userManagement: _router({
    search: staffProcedure
      .input(searchParam)
      .query(({ input }) => {
        return admin.userList({
          ...input,
          flag: input.flag === CountryCode.Unknown ? undefined : input.flag,
          id: input.id ? UserProvider.stringToId(input.id) : undefined,
        })
      }),
    detail: staffProcedure.input(string()).query(({ input }) => {
      return admin.userDetail({ id: UserProvider.stringToId(input) }).then(detail => mapId(detail, UserProvider.idToString))
    }),
    saveDetail: staffProcedure
      .input(
        tuple([
          string(),
          object({
            id: string(),
            name: zodHandle,
            safeName: zodHandle,
            email: string().email(),
            flag: nativeEnum(CountryCode),
            roles: array(nativeEnum(UserRole)),

            password: string().optional(),
          }).partial(),
        ])
      )
      .mutation(async ({ input, ctx }) => {
        let [id, newVal] = input
        // staff can only change some fields
        if (!ctx.user.role.admin) {
          const keys = Object.keys(newVal).filter(i => isUserFieldEditable(i as keyof typeof newVal, ctx.user.role)) as Array<keyof typeof newVal>
          newVal = pick(newVal, keys)
        }
        const res = await admin.updateUserDetail(
          ctx.user,
          {
            id: UserProvider.stringToId(id),
          },
          {
            ...newVal,
            id: newVal.id ? UserProvider.stringToId(newVal.id) : undefined,
          },
        )

        return mapId(res, UserProvider.idToString)
      }),

    computeUserStat: staffProcedure
      .input(object({
        id: string(),
        mode: zodMode,
        ruleset: zodRuleset,
      }))
      .query(async ({ input }) => {
        return admin.calcUserStatistics({ id: UserProvider.stringToId(input.id), mode: input.mode, ruleset: input.ruleset })
      }),

    userModeStat: staffProcedure
      .input(object({
        id: string(),
        mode: zodMode,
        ruleset: zodRuleset,
      }))
      .query(async ({ input }) => {
        return admin.getStoredUserStatistics({ id: UserProvider.stringToId(input.id), mode: input.mode, ruleset: input.ruleset })
      }),

  }),
})
