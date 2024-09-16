import { type Query, aliasedTable, and, count, desc, eq, max, sql, sum } from 'drizzle-orm'
import type { Id } from '..'
import { encryptBanchoPassword } from '../crypto'
import * as schema from '../drizzle/schema'
import { config } from '../env'
import { Logger } from '../log'
import { type DatabaseUserCompactFields, type DatabaseUserOptionalFields, fromCountryCode, toBanchoMode, toBanchoPyMode, toBanchoPyPriv, toRoles, toSafeName, toUserCompact, toUserOptional } from '../transforms'
import { BanchoPyPrivilege, BanchoPyScoreStatus } from '../enums'
import { useDrizzle } from './source/drizzle'
import { GucchoError } from '~/def/messages'
import { type UserClan, type UserCompact, type UserOptional, UserRole, type UserSecrets } from '~/def/user'
import { AdminProvider as Base } from '$base/server'
import { type ComputedUserRole } from '~/utils/common'
import { type Mode, type Ruleset } from '~/def'
import { Grade } from '~/def/score'
import { type LeaderboardRankingSystem } from '~/def/common'
import { type ModeRulesetScoreStatistic, type UserModeRulesetStatistics } from '~/def/statistics'

const logger = Logger.child({ label: 'user' })

const drizzle = useDrizzle(schema)

type DatabaseAdminUserFields = 'lastActivity' | 'creationTime'
export class AdminProvider extends Base<Id> implements Base<Id> {
  config = config()
  drizzle = drizzle
  logger = logger
  async userList(
    query: Partial<UserCompact<Id> & Pick<UserOptional, 'email' | 'status'>> &
    Partial<UserSecrets> & {
      page: number
      perPage: number
    }
  ) {
    const rolesPriv = toBanchoPyPriv(query.roles || [], 0)

    const cond = [
      query.id ? eq(schema.users.id, query.id) : undefined,
      query.name ? eq(schema.users.name, query.name) : undefined,
      query.safeName ? eq(schema.users.safeName, query.safeName) : undefined,
      query.email ? eq(schema.users.email, query.email) : undefined,
      query.flag ? eq(schema.users.country, query.flag) : undefined,
      query.roles?.length ? sql`${schema.users.priv} & ${rolesPriv} = ${rolesPriv}` : undefined,
      query.roles?.includes(UserRole.Restricted) ? sql`${schema.users.priv} & 1 = 0` : undefined,
    ]

    const baseQuery = this.drizzle
      .select({
        user: pick(schema.users, [
          'id',
          'name',
          'safeName',
          'priv',
          'country',
          'email',
          'preferredMode',
          'lastActivity',
          'creationTime',
        ] satisfies Array<
          | DatabaseUserCompactFields
          | DatabaseUserOptionalFields
          | DatabaseAdminUserFields
        >),
        clan: pick(schema.clans, ['id', 'name', 'badge']),
      })
      .from(schema.users)
      .leftJoin(schema.clans, eq(schema.clans.id, schema.users.clanId))
      .where(and(...cond))
      .orderBy(desc(schema.users.lastActivity))
      .offset(query.page * query.perPage)
      .limit(query.perPage)

    const uCompacts = baseQuery.then(res =>
      res.map(({ user, clan }) => ({
        ...toUserCompact(user, this.config),
        ...toUserOptional(user),
        lastActivityAt: new Date(user.lastActivity * 1000),
        registeredAt: new Date(user.creationTime * 1000),
        clan: clan
          ? ({
              id: clan.id,
              name: clan.name,
              badge: clan.badge,
            } satisfies UserClan<Id>)
          : undefined,
      }))
    ) satisfies Promise<
      Array<
        UserCompact<Id> &
        Pick<UserOptional, 'email' | 'status'> & {
          registeredAt: Date
          lastActivityAt: Date
          clan?: UserClan<Id>
        }
      >
    >

    return Promise.all([

      this.drizzle
        .select({
          count: sql`count(*)`.mapWith(Number),
        })
        .from(schema.users)
        .leftJoin(schema.clans, eq(schema.clans.id, schema.users.clanId))
        .where(
          and(...cond)
        )
        .execute()
        .then(res => res[0].count),

      uCompacts,
    ] as const)
  }

  async userDetail(query: { id: Id }): Promise<UserCompact<Id> & UserOptional> {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(schema.users.id, query.id),
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    return {
      ...toUserCompact(user, this.config),
      ...toUserOptional(user),
    }
  }

  /**
   * This function merges the current roles with the roles to be updated.
   * It filters out the roles that cannot be edited by the current user,
   * and then appends the roles that can be edited.
   *
   */
  mergeUpdateRoles(
    updater: { role: ComputedUserRole },
    currentRoles: UserRole[],
    updateRoles: UserRole[]
  ) {
    return currentRoles
      // Filter out the roles that cannot be edited by the current user.
      // The current user can only edit roles that are not editable by themselves.
      .filter(r =>
        !isRoleEditable(updater.role, r)
      )
      // Filter out the roles that can be edited by the current user.
      // The current user can edit roles that are editable by themselves.
      .concat(
        updateRoles.filter(r =>
          isRoleEditable(updater.role, r)
        )
      )
  }

  async updateUserDetail(
    updater: { role: ComputedUserRole },
    query: { id: Id },
    updateFields: Partial<UserCompact<Id> & UserOptional & UserSecrets>
  ): Promise<UserCompact<Id> & UserOptional> {
    const { priv }
      = (await this.drizzle.query.users.findFirst({
        where: eq(schema.users.id, query.id),
        columns: {
          priv: true,
        },
      })) ?? throwGucchoError(GucchoError.UserNotFound)

    const currentRoles = toRoles(priv)

    const basePriv = updateFields.roles?.includes(UserRole.Restricted)
      ? BanchoPyPrivilege.Any | (priv & BanchoPyPrivilege.Verified)
      : BanchoPyPrivilege.Registered | (priv & BanchoPyPrivilege.Verified)

    await this.drizzle
      .update(schema.users)
      .set({
        id: updateFields.id,
        name: updateFields.name,
        safeName: updateFields.name ? toSafeName(updateFields.name) : undefined,
        pwBcrypt: updateFields.password
          ? await encryptBanchoPassword(updateFields.password)
          : undefined,
        email: updateFields.email,
        country: updateFields.flag
          ? fromCountryCode(updateFields.flag)
          : undefined,
        priv: updateFields.roles
          ? toBanchoPyPriv(
            this.mergeUpdateRoles(updater, currentRoles, updateFields.roles),
            basePriv
          )
          : undefined,
      })
      .where(eq(schema.users.id, query.id))

    const user
      = (await this.drizzle.query.users.findFirst({
        where: eq(schema.users.id, updateFields.id ?? query.id),
      })) ?? raise(Error, 'cannot find updated user. Did you changed user id?')

    return {
      ...toUserCompact(user, this.config),
      ...toUserOptional(user),
    }
  }

  computeScoreStatus = this.drizzle
    .select({
      id: schema.scores.userId,
      mode: schema.scores.mode,
      totalScore: sum(schema.scores.score).mapWith(BigInt).as('computedTotalScore'),
      totalHit: sum(sql`${schema.scores.n50} + ${schema.scores.n100} + ${schema.scores.n300} + ${schema.scores.nGeki} + ${schema.scores.nKatu}`).mapWith(BigInt).as('computedTTH'),
      playTime: sum(schema.scores.timeElapsed).mapWith(Number).as('computedPlayTime'),
      playCount: count(sql`1`).as('playCount'),
    })
    .from(schema.scores)
    .groupBy(schema.scores.userId, schema.scores.mode)
    .as('cts')

  computeRankedScoreStatus = this.drizzle
    .select({
      id: schema.scores.userId,
      mode: schema.scores.mode,
      rankedScore: sum(schema.scores.score).mapWith(BigInt).as('rankedScore'),
      maxCombo: max(schema.scores.maxCombo).mapWith(Number).as('maxCombo'),
      count: {
        A: count(sql`if(${schema.scores.grade} = ${Grade.A}, 1, null)`).as('gradeA'),
        B: count(sql`if(${schema.scores.grade} = ${Grade.B}, 1, null)`).as('gradeB'),
        C: count(sql`if(${schema.scores.grade} = ${Grade.C}, 1, null)`).as('gradeC'),
        D: count(sql`if(${schema.scores.grade} = ${Grade.D}, 1, null)`).as('gradeD'),
        F: count(sql`if(${schema.scores.grade} = ${Grade.F}, 1, null)`).as('gradeF'),
        S: count(sql`if(${schema.scores.grade} = ${Grade.S}, 1, null)`).as('gradeS'),
        SH: count(sql`if(${schema.scores.grade} = ${Grade.SH}, 1, null)`).as('gradeSH'),
        SS: count(sql`if(${schema.scores.grade} = ${Grade.SS}, 1, null)`).as('gradeSS'),
        SSH: count(sql`if(${schema.scores.grade} = ${Grade.SSH}, 1, null)`).as('gradeSSH'),
      },
    })
    .from(schema.scores)
    .groupBy(schema.scores.userId, schema.scores.mode)
    .where(eq(schema.scores.status, BanchoPyScoreStatus.Pick))
    .as('crs')

  async calcUserStatistics(q: { id: Id; mode: Mode; ruleset: Ruleset }): Promise<ModeRulesetScoreStatistic> {
    const { id, mode, ruleset } = q
    const result = await this.drizzle
      .with(
        this.computeScoreStatus,
        this.computeRankedScoreStatus,
      )
      .select({
        totalScore: this.computeScoreStatus.totalScore,
        totalHits: this.computeScoreStatus.totalHit,
        playTime: this.computeScoreStatus.playTime,
        playCount: this.computeScoreStatus.playCount,
        rankedScore: this.computeRankedScoreStatus.rankedScore,
        maxCombo: this.computeRankedScoreStatus.maxCombo,
        scoreRankComposition: {
          [Grade.A]: this.computeRankedScoreStatus.count.A,
          [Grade.B]: this.computeRankedScoreStatus.count.B,
          [Grade.C]: this.computeRankedScoreStatus.count.C,
          [Grade.D]: this.computeRankedScoreStatus.count.D,
          [Grade.F]: this.computeRankedScoreStatus.count.F,
          [Grade.S]: this.computeRankedScoreStatus.count.S,
          [Grade.SH]: this.computeRankedScoreStatus.count.SH,
          [Grade.SS]: this.computeRankedScoreStatus.count.SS,
          [Grade.SSH]: this.computeRankedScoreStatus.count.SSH,
        },
      })
      .from(this.computeScoreStatus)
      .innerJoin(this.computeRankedScoreStatus, and(
        eq(this.computeScoreStatus.id, this.computeRankedScoreStatus.id),
        eq(this.computeScoreStatus.mode, this.computeRankedScoreStatus.mode),
      ))
      .where(
        and(
          eq(this.computeScoreStatus.id, id),
          eq(this.computeScoreStatus.mode, toBanchoPyMode(mode, ruleset))
        )
      )
      .limit(1)
      .then(res => res[0])

    if (!result) {
      return {
        playCount: 0,
        playTime: 0,
        totalHits: 0n,
        level: 0,
        maxCombo: 0,
        scoreRankComposition: {
          [Grade.F]: 0,
          [Grade.D]: 0,
          [Grade.C]: 0,
          [Grade.B]: 0,
          [Grade.A]: 0,
          [Grade.SH]: 0,
          [Grade.SS]: 0,
          [Grade.SSH]: 0,
          [Grade.S]: 0,
        },
        rankedScore: 0n,
        totalScore: 0n,

      } satisfies ModeRulesetScoreStatistic
    }

    return {
      ...result,
      level: getLevel(result.totalScore),
    }
  }

  async getStoredUserStatistics(query: { id: number; mode: Mode; ruleset: Ruleset }): Promise<ModeRulesetScoreStatistic> {
    const res = await this.drizzle.query.stats.findFirst({
      where: (tbl, op) => op.and(op.eq(tbl.id, query.id), op.eq(tbl.mode, toBanchoPyMode(query.mode, query.ruleset))),
    }) ?? throwGucchoError(GucchoError.UserNotFound)
    return {
      playCount: res.plays,
      playTime: res.playTime,
      totalHits: BigInt(res.totalHits),
      level: getLevel(res.totalScore),
      maxCombo: res.maxCombo,
      scoreRankComposition: {
        [Grade.F]: 0,
        [Grade.D]: 0,
        [Grade.C]: 0,
        [Grade.B]: 0,
        [Grade.A]: res.aCount,
        [Grade.SH]: res.shCount,
        [Grade.SS]: res.xCount,
        [Grade.SSH]: res.xhCount,
        [Grade.S]: res.sCount,
      },
      // replayWatchedByOthers: res.replayViews,
      // ppv1: {
      //   performance: 0,
      // },
      // ppv2: {
      //   performance: res.pp,
      // },
      rankedScore: res.rankedScore,
      totalScore: res.totalScore,
    }
  }

  updateUserStatistics(query: { id: number; mode: Mode; ruleset: Ruleset }, update: Partial<ModeRulesetScoreStatistic>): Promise<ModeRulesetScoreStatistic> {
    throw new Error('Method not implemented.')
  }

  async temp_userUpdateStatGenSQL(query: { id: number; mode: Mode; ruleset: Ruleset }, update: Partial<ModeRulesetScoreStatistic>): Promise<Query> {
    return this.drizzle.update(schema.stats).set({
      totalHits: Number(update.totalHits),
      playTime: update.playTime,
      plays: update.playCount,
      rankedScore: update.rankedScore,
      totalScore: update.totalScore,
      maxCombo: update.maxCombo,
      aCount: update.scoreRankComposition?.[Grade.A],
      shCount: update.scoreRankComposition?.[Grade.SH],
      xCount: update.scoreRankComposition?.[Grade.SS],
      xhCount: update.scoreRankComposition?.[Grade.SSH],
      sCount: update.scoreRankComposition?.[Grade.S],
    })
      .where(
        and(
          eq(schema.stats.id, query.id),
          eq(schema.stats.mode, toBanchoPyMode(query.mode, query.ruleset))
        )
      ).toSQL()
  }
}
