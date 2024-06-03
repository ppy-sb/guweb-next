import { mkdirSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { aliasedTable, and, desc, eq, inArray, like, or, sql } from 'drizzle-orm'
import imageType from 'image-type'
import { glob } from 'glob'
import { TRPCError } from '@trpc/server'
import { type QueryError } from 'mysql2'
import type { Id, ScoreId } from '..'
import { getLiveUserStatus } from '../api-client'
import { compareBanchoPassword, encryptBanchoPassword } from '../crypto'
import {
  userCompactFields,
} from '../db-query'
import type { settings } from '../dynamic-settings'
import { BanchoPyMode, BanchoPyScoreStatus } from '../enums'
import { config } from '../env'
import { Logger } from '../log'
import {
  BPyMode,
  type DatabaseUserCompactFields,
  type DatabaseUserOptionalFields,

  beatmapRequiredFields,
  createRulesetData,
  fromBanchoPyMode,
  fromCountryCode,
  fromRankingStatus,
  idToString,
  scoreRequiredFields,
  stringToId,
  toBanchoPyMode,
  toFullUser,
  toRankingSystemScores,
  toSafeName,
  toUserClan,
  toUserCompact,
  toUserOptional,
} from '../transforms'
import * as schema from '../drizzle/schema'
import { ArticleProvider } from './article'
import { client as redisClient } from './source/redis'
import { UserRelationProvider } from './user-relations'
import { useDrizzle, userPriv } from './source/drizzle'
import { GucchoError } from '~/def/messages'
import { type DynamicSettingStore, Scope, type UserCompact, type UserOptional, UserRole, type UserStatistic, UserStatus } from '~/def/user'
import type { CountryCode } from '~/def/country-code'
import type { ActiveMode, ActiveRuleset, LeaderboardRankingSystem } from '~/def/common'
import { Mode, Rank, Ruleset } from '~/def'
import { UserProvider as Base, type MailTokenProvider } from '$base/server'
import type { ExtractLocationSettings, ExtractSettingType } from '$base/@define-setting'
import { type RankingSystemScore } from '~/def/score'
import { RankingStatus } from '~/def/beatmap'

type ServerSetting = ExtractSettingType<ExtractLocationSettings<DynamicSettingStore.Server, typeof settings>>

const logger = Logger.child({ label: 'user' })

function ensureDirectorySync(targetDir: string, { isRelativeToScript = false } = {}) {
  const initDir = isAbsolute(targetDir) ? sep : ''
  const baseDir = isRelativeToScript ? __dirname : '.'

  return targetDir.split(sep).reduce((parentDir: string, childDir: string) => {
    const curDir = resolve(baseDir, parentDir, childDir)
    try {
      mkdirSync(curDir)
    }
    catch (err: any) {
      if (err.code === 'EEXIST') { // curDir already exists!
        return curDir
      }

      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`)
      }

      const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].includes(err.code)
      if (!caughtErr || (caughtErr && curDir === resolve(targetDir))) {
        throw err // Throw if it's just the last created dir.
      }
    }

    return curDir
  }, initDir)
}

const bpyNumModes = Object.keys(BPyMode)
const drizzle = useDrizzle(schema)
export const enum FilterType {
  BlockIfNotMatched,
  BlockIfMatched,
}

class DBUserProvider extends Base<Id, ScoreId> implements Base<Id, ScoreId> {
  static readonly stringToId = stringToId
  static readonly idToString = idToString

  private drizzle = drizzle
  relationships = new UserRelationProvider()
  config = config()

  usernamePatterns: Array<{ match: string | RegExp; reason: string; type: FilterType }> = [
    {
      type: FilterType.BlockIfNotMatched,
      match: /^[\w [\]-]{2,15}$/gu,
      reason: 'Username should between 2 - 14 chars long, allows a-z, 0-9, [] and -, _',
    },
  ]

  protected readonly bestsRankingStatuses = [RankingStatus.Ranked, RankingStatus.Approved]
  protected readonly topsRankingStatuses = [RankingStatus.Ranked, RankingStatus.Approved, RankingStatus.Qualified]

  constructor() {
    super()

    if (this.config.avatar.location) {
      ensureDirectorySync(this.config.avatar.location)
    }
  }

  async uniqueIdent(handle: string) {
    const handleNum = +handle

    const res = await this.drizzle.query.users.findFirst({
      columns: { id: true },

      where: or(
        eq(schema.users.email, handle),
        eq(schema.users.name, handle),
        eq(schema.users.safeName, handle),

        Number.isNaN(handleNum)
          ? undefined
          : eq(schema.users.id, handleNum),

        handle.startsWith('@')
          ? eq(schema.users.safeName, handle.slice(1))
          : undefined
      ),
    })

    return !!res
  }

  async getCompactById(id: Id) {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(schema.users.id, id),
      columns: userCompactFields,
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    return toUserCompact(user, this.config)
  }

  async getByEmail(email: MailTokenProvider.Email, opt: { scope: Scope }): Promise<UserCompact<number>> {
    return this.getCompact({ handle: email, scope: opt?.scope, keys: ['email'] })
  }

  async getCompact(opt: Base.OptType & { scope: Scope }) {
    const { handle, scope, keys = ['id', 'name', 'safeName', 'email'] } = opt

    let handleNum = +handle
    if (Number.isNaN(handleNum)) {
      handleNum = -1
    }
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        or(
          keys.includes('id') && !Number.isNaN(handleNum)
            ? eq(schema.users.id, handleNum)
            : undefined,

          keys.includes('name')
            ? eq(schema.users.name, handle)
            : undefined,

          keys.includes('safeName')
            ? eq(schema.users.safeName, handle)
            : undefined,

          keys.includes('email')
            ? eq(schema.users.email, handle)
            : undefined
        ),
        scope === Scope.Self
          ? undefined
          : userPriv(schema.users)
      ),
      columns: {
        ...userCompactFields,
      },
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    return toUserCompact(user, this.config)
  }

  async testPassword(opt: Base.OptType, hashedPassword: string): Promise<[boolean, UserCompact<Id>]> {
    const handleNum = +opt.handle

    const user = await this.drizzle.query.users.findFirst({
      columns: {
        id: true,
        name: true,
        safeName: true,
        country: true,
        priv: true,
        pwBcrypt: true,
      },

      where: or(
        eq(schema.users.email, opt.handle),
        eq(schema.users.name, opt.handle),
        eq(schema.users.safeName, opt.handle),

        Number.isNaN(handleNum)
          ? undefined
          : eq(schema.users.id, handleNum),

        opt.handle.startsWith('@')
          ? eq(schema.users.safeName, opt.handle.slice(1))
          : undefined
      ),
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    return [await compareBanchoPassword(hashedPassword, user.pwBcrypt), toUserCompact(user, this.config)]
  }

  private _s = aliasedTable(schema.scores, 's')
  private _bm = aliasedTable(schema.beatmaps, 'b')
  private _bs = aliasedTable(schema.sources, 'bs')

  async getBests<M extends Mode, RS extends LeaderboardRankingSystem>({
    id,
    mode,
    ruleset,
    rankingSystem,
    page,
    perPage,
    rankingStatus = this.bestsRankingStatuses,
  }: Base.BaseQuery<Id, M, ActiveRuleset, RS>): Promise<RankingSystemScore<ScoreId, Id, Mode, RS>[]> {
    const start = page * perPage
    const _mode = toBanchoPyMode(mode, ruleset)
    if (_mode === undefined) {
      throwGucchoError(GucchoError.ModeNotSupported)
    }
    const banchoPyRankingStatus = rankingStatus.map(i => fromRankingStatus(i))

    const result = await this.drizzle.select({
      score: pick(this._s, scoreRequiredFields),
      beatmap: pick(this._bm, beatmapRequiredFields),
      source: this._bs,
    })
      .from(this._s)
      .innerJoin(this._bm, eq(this._bm.md5, this._s.mapMd5))
      .innerJoin(this._bs, and(
        eq(this._bm.setId, this._bs.id),
        eq(this._bm.server, this._bs.server)
      ))
      .where(({ score, beatmap }) => and(
        eq(this._s.userId, id),
        eq(this._s.status, BanchoPyScoreStatus.Pick),
        eq(score.mode, _mode),
        inArray(beatmap.status, banchoPyRankingStatus)
      ))

      .orderBy(({ score }) => rankingSystem === Rank.PPv2
        ? desc(score.pp)
        : (rankingSystem === Rank.RankedScore || rankingSystem === Rank.TotalScore)
            ? desc(score.score)
            : raiseError('unknown ranking system')
      )
      .offset(start)
      .limit(perPage)

    return toRankingSystemScores({
      scores: result,
      rankingSystem,
      mode,
    }).map(score =>
      Object.assign(score, {
        id: score.id.toString(),
      }),
    )
  }

  async getTops<M extends ActiveMode, RS extends LeaderboardRankingSystem>(opt: Base.BaseQuery<Id, M, ActiveRuleset, RS>) {
    const {
      id,
      mode,
      ruleset,
      rankingSystem,
      page,
      perPage,
      rankingStatus = this.topsRankingStatuses,
    } = opt

    const start = page * perPage

    const banchoPyRankingStatus = rankingStatus?.map(i => fromRankingStatus(i))

    // derived tables
    const s = aliasedTable(schema.scores, 's')
    const s2 = aliasedTable(schema.scores, 's2')
    const s3 = aliasedTable(schema.scores, 's3')
    const u = aliasedTable(schema.users, 'u')
    const u2 = aliasedTable(schema.users, 'u2')
    const bm = aliasedTable(schema.beatmaps, 'm')
    const bms = aliasedTable(schema.sources, 'ms')

    const userHaveScores = this.drizzle.selectDistinct({ md5: s3.mapMd5 })
      .from(s3)
      .where(and(
        eq(s3.mode, toBanchoPyMode(mode, ruleset)),
        eq(s3.userId, id)
      )).as('ssq')

    const maxScores = this.drizzle.select({
      mapMd5: s2.mapMd5,
      v: sql`MAX(${rankingSystem === Rank.PPv2 ? s2.pp : s2.score})`.as('v'),
      countScores: sql`COUNT(*)`.mapWith(Number).as('countScores'),
      lowestId: sql`MIN(${s2.id})`.as('lowestId'),
    }).from(s2)
      .innerJoin(u2, eq(s2.userId, u2.id))
      .innerJoin(userHaveScores, eq(userHaveScores.md5, s2.mapMd5))
      .where(and(
        userPriv(u2),
        eq(s2.mode, toBanchoPyMode(mode, ruleset)),
      ))
      .groupBy(s2.mapMd5)
      .as('sq')

    const q2 = this.drizzle.select({
      score: pick(s, scoreRequiredFields),
      beatmap: pick(bm, beatmapRequiredFields),
      source: bms,
      fullCount: sql`COUNT(*) OVER()`.mapWith(Number).as('full_count'),
    }).from(s)
      .innerJoin(maxScores, and(
        eq(maxScores.mapMd5, s.mapMd5),
        eq(rankingSystem === Rank.PPv2 ? s.pp : s.score, maxScores.v),
        eq(s.id, maxScores.lowestId)
      ))
      .innerJoin(bm, and(
        eq(bm.md5, s.mapMd5),
        inArray(bm.status, banchoPyRankingStatus),
      ))
      .innerJoin(bms, and(
        eq(bm.setId, bms.id),
        eq(bm.server, bms.server)
      ))
      .innerJoin(u, eq(u.id, s.userId))
      .where(eq(s.userId, id))
      .orderBy(
        desc(maxScores.countScores),
        desc(s.id)
      )
      .offset(start)
      .limit(perPage)

    const scoresData = await q2

    const count = scoresData.length > 0 ? scoresData[0].fullCount : 0
    const scores = scoresData

    return {
      count,
      scores: toRankingSystemScores({ scores, rankingSystem, mode }),
    }
  }

  async _getStatistics(opt: { id: Id; flag?: CountryCode }) {
    const { id } = opt
    const sq = this.drizzle.select({
      id: schema.stats.id,
      mode: schema.stats.mode,

      ppv2Rank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode} ORDER BY ${schema.stats.pp} DESC)`
        .mapWith(Number)
        .as('ppRank'),
      ppv2CountryRank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode}, ${schema.users.country} ORDER BY ${schema.stats.pp} DESC)`
        .mapWith(Number)
        .as('ppCountryRank'),

      totalScoreRank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode} ORDER BY ${schema.stats.totalScore} DESC)`
        .mapWith(Number)
        .as('tscoreRank'),
      totalScoreCountryRank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode}, ${schema.users.country} ORDER BY ${schema.stats.totalScore} DESC)`
        .mapWith(Number)
        .as('tscoreCountryRank'),

      rankedScoreRank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode} ORDER BY ${schema.stats.rankedScore} DESC)`
        .mapWith(Number)
        .as('rscoreRank'),
      rankedScoreCountryRank: sql`RANK() OVER(PARTITION BY ${schema.stats.mode}, ${schema.users.country} ORDER BY ${schema.stats.rankedScore} DESC)`
        .mapWith(Number)
        .as('rscoreCountryRank'),
    })
      .from(schema.stats)
      .innerJoin(schema.users, and(
        eq(schema.users.id, schema.stats.id),
        userPriv(schema.users)
      )).as('sq')

    const s2 = aliasedTable(schema.stats, 's2')
    const mq = this.drizzle.select({
      ppv2Rank: sq.ppv2Rank,
      ppv2CountryRank: sq.ppv2CountryRank,

      totalScoreRank: sq.totalScoreRank,
      totalScoreCountryRank: sq.totalScoreCountryRank,

      rankedScoreRank: sq.rankedScoreRank,
      rankedScoreCountryRank: sq.rankedScoreCountryRank,
      stat: s2,
    }).from(sq)
      .innerJoin(s2,
        and(
          eq(sq.id, s2.id),
          eq(sq.mode, s2.mode),
        )
      )
      .where(eq(s2.id, id))

    return await mq
  }

  async getStatistics(opt: { id: Id; flag?: CountryCode }) {
    const query = await this._getStatistics(opt)

    return this._toStatistics(query)
  }

  async getFull<
    Excludes extends Partial<
      Record<keyof Base.ComposableProperties<Id>, boolean>
    >,
    _Scope extends Scope = Scope.Public,
  >({
    handle,
    excludes = {} as Excludes,
    includeHidden,
    scope,
  }: {
    handle: string
    excludes?: Excludes
    includeHidden?: boolean
    scope: _Scope
  }) {
    const userId = +handle
    const isNumber = !Number.isNaN(userId)
    const [{ user, clan } = throwGucchoError(GucchoError.UserNotFound)] = await this.drizzle.select({
      user: schema.users,
      clan: schema.clans,
    }).from(schema.users)
      .leftJoin(schema.clans, eq(schema.users.clanId, schema.clans.id))
      .where(
        and(
          or(
            isNumber ? eq(schema.users.id, userId) : undefined,
            eq(schema.users.name, handle),
            eq(schema.users.safeName, handle),
            handle.startsWith('@') ? eq(schema.users.safeName, handle.slice(1)) : undefined,
          ),
          (includeHidden || scope === Scope.Self) ? undefined : userPriv(schema.users)
        )
      )
      .limit(1)

    const returnValue = toFullUser(user, this.config) as NonNullable<Awaited<ReturnType<Base<Id, ScoreId>['getFull']>>>
    const [mode, ruleset] = fromBanchoPyMode(user.preferredMode)
    returnValue.preferredMode = {
      mode, ruleset,
    }
    const parallels: Promise<any>[] = []

    returnValue.status = UserStatus.Offline

    if (excludes.statistics !== true) {
      parallels.push(
        this.getStatistics(returnValue).then((res) => {
          returnValue.statistics = res
        }),
      )
    }
    if (excludes.relationships !== true) {
      parallels.push(
        this.relationships.get({ user }).then((res) => {
          returnValue.relationships = res
        }),
      )
    }
    if (excludes.email !== true) {
      returnValue.email = user.email
    }

    if (excludes.clan !== true) {
      returnValue.clan = toUserClan({ ...user, clan }).clan
    }

    if (excludes.profile !== true) {
      returnValue.profile = {
        html: user.userpageContent ?? '',
      }
    }

    await Promise.all(parallels)
      .catch((e) => {
        logger.error(e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message })
      })

    return returnValue
  }

  async changeEmail(user: { id: Id }, newEmail: MailTokenProvider.Email): Promise<Pick<UserOptional, 'email'>> {
    return await this.drizzle.transaction(async (tx) => {
      await tx.update(schema.users)
        .set({
          email: newEmail,
        })
        .where(eq(schema.users.id, user.id))
        .catch((e: QueryError) => {
          if (e.code === 'ER_DUP_ENTRY') {
            throwGucchoError(GucchoError.ConflictEmail)
          }
          throw e
        })

      const result = await tx.query.users.findFirst({
        where: (tb, op) => op.eq(tb.id, user.id),
        columns: {
          email: true,
        },
      }) ?? throwGucchoError(GucchoError.UserNotFound)

      return result
    })
  }

  async changeSettings(
    user: { id: Id; roles: UserRole[] },
    input: {
      // email?: string
      name?: string
      flag?: CountryCode
      preferredMode?: {
        mode: Mode
        ruleset: Ruleset
      }
    },
  ) {
    if (input.name) {
      this.ensureUsernameIsAllowed(input.name)
      const existingUser = await this.getCompact({
        handle: input.name,
        keys: ['id', 'name', 'safeName'],
        scope: Scope.Self,
      }).catch(noop<undefined>)

      if (existingUser) {
        return throwGucchoError(GucchoError.UserExists)
      }
    }

    await this.drizzle.update(schema.users)
      .set({
        name: user.roles.includes(UserRole.Supporter)
          ? input.name
          : undefined,

        safeName: user.roles.includes(UserRole.Supporter)
          ? input.name && toSafeName(input.name)
          : undefined,

        country: user.roles.includes(UserRole.Supporter)
          ? input.flag && fromCountryCode(input.flag)
          : undefined,

        preferredMode: input.preferredMode
          ? toBanchoPyMode(input.preferredMode.mode, input.preferredMode.ruleset)
          : undefined,
      })
      .where(eq(schema.users.id, user.id))
      .catch((e: QueryError) => {
        if (e.code === 'ER_DUP_ENTRY') {
          throwGucchoError(GucchoError.ConflictEmail)
        }
        throw e
      })

    const returning = await this.drizzle.query.users.findFirst({
      where(eq, op) {
        return op.eq(eq.id, user.id)
      },
      with: {
        clan: true,
      },
      columns: {
        id: true,
        name: true,
        safeName: true,
        country: true,
        priv: true,
        email: true,
        preferredMode: true,
      } satisfies Record<DatabaseUserCompactFields | DatabaseUserOptionalFields, true>,
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    return {
      ...toUserCompact(returning, this.config),
      ...toUserClan(returning),
      ...toUserOptional(returning),
    }
  }

  async changeUserpage(
    user: UserCompact<Id>,
    input: {
      profile: ArticleProvider.JSONContent
    },
  ) {
    const html = await ArticleProvider.render(input.profile)
    try {
      const [res] = await this.drizzle.update(schema.users).set({
        userpageContent: html,
      }).where(eq(schema.users.id, user.id))

      if (!res.affectedRows) {
        throwGucchoError(GucchoError.UpdateUserpageFailed)
      }

      return {
        html,
        raw: input.profile,
      }
    }
    catch (err) {
      logger.error(err)
      throwGucchoError(GucchoError.UpdateUserpageFailed)
    }
  }

  async changePasswordNoCheck(user: { id: Id }, newPassword: string): Promise<void> {
    const result = await this.drizzle.update(schema.users).set({
      pwBcrypt: await encryptBanchoPassword(newPassword),
    })
      .where(eq(schema.users.id, user.id))

    if (!result[0].affectedRows) {
      throwGucchoError(GucchoError.UserNotFound)
    }
  }

  async changePassword(user: Pick<UserCompact<Id>, 'id'>, oldPasswordMD5: string, newPasswordMD5: string) {
    const u = await this.drizzle.query.users.findFirst({
      where: eq(schema.users.id, user.id),
      columns: {
        ...userCompactFields,
        pwBcrypt: true,
      },
    }) ?? throwGucchoError(GucchoError.UserNotFound)

    if (!await compareBanchoPassword(oldPasswordMD5, u.pwBcrypt)) {
      throwGucchoError(GucchoError.OldPasswordMismatch)
    }

    const pwBcrypt = await encryptBanchoPassword(newPasswordMD5)
    await this.drizzle.update(schema.users)
      .set({
        pwBcrypt,
      })
      .where(eq(schema.users.id, u.id))

    return toUserCompact(u, this.config)
  }

  async changeAvatar(user: { id: Id }, avatar: Uint8Array) {
    if (!this.config.avatar.location) {
      throwGucchoError(GucchoError.MissingServerAvatarConfig)
    }
    const mime = await imageType(avatar)

    if (!mime?.mime.includes('image')) {
      throwGucchoError(GucchoError.MimeNotImage)
    }

    const oldFilesPath = `${user.id}.*`

    if (oldFilesPath.startsWith('.')) {
      throwGucchoError(GucchoError.HackerTryingToDeleteAllAvatars)
    }
    const existFilesPath = join(this.config.avatar.location, oldFilesPath)
    const loc = join(this.config.avatar.location, `${user.id}.${mime.ext}`)

    const oldFiles = await glob(existFilesPath)

    if (oldFiles.length > 2) {
      throwGucchoError(GucchoError.DeletingMoreThanOneAvatars)
    }

    await Promise.all(oldFiles.map(file => unlink(file)))

    await writeFile(loc, avatar)
    return `//${this.config.avatar.domain}/${user.id}?${Date.now()}`
  }

  async search({ keyword, limit }: { keyword: string; limit: number }) {
    const _user = `%${keyword}`
    const user_ = `${keyword}%`
    const _user_ = `%${keyword}%`

    const userId = +keyword
    const isNumber = !Number.isNaN(userId)
    const result = await this.drizzle.select({
      user: schema.users,
      clan: schema.clans,
      tag: {
        exactId: isNumber ? eq(schema.users.id, userId) : sql.raw('(select 0)'),

        exactName: eq(schema.users.name, keyword),
        startsWith: like(schema.users.name, user_),
        endsWith: like(schema.users.name, _user),
        contains: like(schema.users.name, _user_),
      },
    }).from(schema.users)
      .leftJoin(schema.clans, schema => eq(schema.user.clanId, schema.clan.id))
      .where(schema => and(
        or(
          schema.tag.exactId,
          schema.tag.startsWith,
          schema.tag.endsWith,
          schema.tag.contains,
        ),
        userPriv(schema.user)
      ))
      .orderBy(table => [
        desc(table.tag.exactId),
        desc(table.tag.exactName),
        desc(table.tag.startsWith),
        desc(table.tag.endsWith),
        desc(table.tag.contains),
      ])
      .limit(limit)

    return result.map(({ user, clan }) => ({
      ...toUserCompact(user, this.config),
      ...toUserClan({ ...user, clan }),
    }))
  }

  async count() {
    /* optimized */
    return await this.drizzle.select({
      count: sql`COUNT(*)`.mapWith(Number),
    }).from(schema.users).where(userPriv(schema.users)).then(res => res[0].count)
  }

  async changeVisibility(user: UserCompact<Id>) {
    throw new Error('bancho.py does not support user visibility scoping.')
    return user
  }

  async status(opt: { id: Id }) {
    if (!this.config.api?.v1) {
      return null
    }
    return getLiveUserStatus(opt, this.config as { api: { v1: string } })
  }

  async register(opt: { name: string; email: string; safeName?: string; passwordMd5: string }) {
    const { name, email, passwordMd5 } = opt
    this.ensureUsernameIsAllowed(name)

    try {
      const user = await this.drizzle.transaction(async (tx) => {
        try {
          const [res] = await tx
            .insert(schema.users)
            .values({
              name,
              safeName: toSafeName(name),
              email,
              pwBcrypt: await encryptBanchoPassword(passwordMd5),
              creationTime: Math.floor(Date.now() / 1000),
            })

          if (!res.affectedRows) {
            return tx.rollback()
          }

          const user = await tx.query.users.findFirst({
            where: eq(schema.users.id, res.insertId),
            columns: userCompactFields,
          }) ?? tx.rollback()

          await tx
            .insert(schema.stats)
            .values(bpyNumModes.map(mode => ({
              id: user.id,
              mode: Number.parseInt(mode),
            })))

          return user
        }
        catch (e) {
          logger.error(e)
          return tx.rollback()
        }
      })

      return toUserCompact(user, this.config)
    }
    catch (e) {
      throwGucchoError(GucchoError.RegistrationFailed)
    }
  }

  async _toStatistics(
    results: ({
      stat: typeof schema.stats.$inferSelect

      ppv2Rank: number
      ppv2CountryRank: number

      totalScoreCountryRank: number
      totalScoreRank: number

      rankedScoreCountryRank: number
      rankedScoreRank: number
    })[],
    livePPRank?: Awaited<ReturnType<RedisUserProvider['getRedisRanks']>>,
  ) {
    const statistics: UserStatistic<
      ActiveMode,
      ActiveRuleset,
      LeaderboardRankingSystem
    > = {
      [Mode.Osu]: {
        [Ruleset.Standard]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.OsuStandard,
          ),
          livePPRank: livePPRank?.[Mode.Osu][Ruleset.Standard],
        }),
        [Ruleset.Relax]: createRulesetData({
          databaseResult: results.find(i => i.stat.mode === BanchoPyMode.OsuRelax),
          livePPRank: livePPRank?.[Mode.Osu][Ruleset.Relax],
        }),
        [Ruleset.Autopilot]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.OsuAutopilot,
          ),
          livePPRank: livePPRank?.[Mode.Osu][Ruleset.Autopilot],
        }),
      },
      [Mode.Taiko]: {
        [Ruleset.Standard]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.TaikoStandard,
          ),
          livePPRank: livePPRank?.[Mode.Taiko][Ruleset.Standard],
        }),
        [Ruleset.Relax]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.TaikoRelax,
          ),
          livePPRank: livePPRank?.[Mode.Taiko][Ruleset.Relax],
        }),
      },
      [Mode.Fruits]: {
        [Ruleset.Standard]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.FruitsStandard,
          ),
          livePPRank: livePPRank?.[Mode.Fruits][Ruleset.Standard],
        }),
        [Ruleset.Relax]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.FruitsRelax,
          ),
          livePPRank: livePPRank?.[Mode.Fruits][Ruleset.Relax],
        }),
      },
      [Mode.Mania]: {
        [Ruleset.Standard]: createRulesetData({
          databaseResult: results.find(
            i => i.stat.mode === BanchoPyMode.ManiaStandard,
          ),
          livePPRank: livePPRank?.[Mode.Mania][Ruleset.Standard],
        }),
      },
    }
    return statistics
  }

  async getDynamicSettings({ id }: { id: Id }) {
    const user = await this.drizzle.query.users
      .findFirst({
        where: eq(schema.users.id, id),
        columns: {
          apiKey: true,
        },
      }) ?? throwGucchoError(GucchoError.UserNotFound)
    return {
      apiKey: user.apiKey || undefined,
    } satisfies ServerSetting as ServerSetting
  }

  async setDynamicSettings(user: { id: number }, args: ServerSetting): Promise<ServerSetting> {
    const returnValue = await this.drizzle.query.users.findFirst({
      where(table, op) {
        return op.eq(table.id, user.id)
      },
      columns: {
        apiKey: true,
      },
    })
    return {
      apiKey: returnValue?.apiKey || undefined,
    }
  }

  ensureUsernameIsAllowed(input: string) {
    // eslint-disable-next-line array-callback-return
    const failedPattern = this.usernamePatterns.find((pattern) => {
      switch (pattern.type) {
        case FilterType.BlockIfNotMatched:
          return !input.match(pattern.match)
        case FilterType.BlockIfMatched:
          return input.match(pattern.match)
        default:
          assertNotReachable(pattern.type)
      }
    })
    if (failedPattern) {
      raise(Error, failedPattern.reason)
    }
  }
}

export class RedisUserProvider extends DBUserProvider {
  redisClient: ReturnType<typeof redisClient>
  constructor() {
    super()
    this.redisClient = redisClient()
  }

  async getLiveRank(id: number, mode: number, country: string) {
    if (this.redisClient.isReady) {
      return {
        rank: await this.redisClient.zRevRank(
          `bancho:leaderboard:${mode}`,
          idToString(id),
        ),
        countryRank: await this.redisClient.zRevRank(
          `bancho:leaderboard:${mode}:${country}`,
          idToString(id),
        ),
      }
    }
  }

  async getRedisRanks({ id, flag }: { id: Id; flag: CountryCode }) {
    const country = fromCountryCode(flag)
    if (!this.redisClient) {
      return undefined
    }
    return {
      [Mode.Osu]: {
        [Ruleset.Standard]: await this.getLiveRank(
          id,
          BanchoPyMode.OsuStandard,
          country,
        ),
        [Ruleset.Relax]: await this.getLiveRank(id, BanchoPyMode.OsuRelax, country),
        [Ruleset.Autopilot]: await this.getLiveRank(
          id,
          BanchoPyMode.OsuAutopilot,
          country,
        ),
      },
      [Mode.Taiko]: {
        [Ruleset.Standard]: await this.getLiveRank(
          id,
          BanchoPyMode.TaikoStandard,
          country,
        ),
        [Ruleset.Relax]: await this.getLiveRank(id, BanchoPyMode.TaikoRelax, country),
      },
      [Mode.Fruits]: {
        [Ruleset.Standard]: await this.getLiveRank(
          id,
          BanchoPyMode.FruitsStandard,
          country,
        ),
        [Ruleset.Relax]: await this.getLiveRank(id, BanchoPyMode.FruitsRelax, country),
      },
      [Mode.Mania]: {
        [Ruleset.Standard]: await this.getLiveRank(
          id,
          BanchoPyMode.ManiaStandard,
          country,
        ),
      },
    }
  }

  async getStatistics(opt: { id: Id; flag: CountryCode }) {
    const res = await this._getStatistics(opt)
    const livePPRank = await this.getRedisRanks(opt)

    return this._toStatistics(res, livePPRank)
  }
}

export const UserProvider = config().leaderboardSource === 'redis' ? RedisUserProvider : DBUserProvider
