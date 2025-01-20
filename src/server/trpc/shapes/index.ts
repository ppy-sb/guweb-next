import { existsSync } from 'node:fs'
import validator from 'validator'
import {
  NEVER,
  ZodIssueCode,
  type ZodSchema,
  any,
  literal,
  nativeEnum,
  number,
  object,
  record,
  string,
  tuple,
  union,
} from 'zod'
import { hasRuleset } from '../config'
import { type MailTokenProvider } from '$base/server'
import type { ArticleProvider } from '$base/server/article'
import { LeaderboardScoreRank, Mode, PPRank, Relationship, Ruleset, ScoreRank } from '~/def'
import { RankingStatus } from '~/def/beatmap'
import { type UnionModeRuleset } from '~/def/server'

export const zodHandle = string().trim().transform(v => decodeURIComponent(v))
export const zodRelationType = nativeEnum(Relationship)

export const zodMode = nativeEnum(Mode)
export const zodRuleset = nativeEnum(Ruleset)

export const zodPPRankingSystem = nativeEnum(PPRank)
export const zodScoreRankingSystem = nativeEnum(LeaderboardScoreRank)
export const zodLeaderboardRankingSystem = zodPPRankingSystem.or(zodScoreRankingSystem)
export const zodRankingSystem = zodPPRankingSystem.or(nativeEnum(ScoreRank))

export const zodSafeModeRuleset = object({
  mode: zodMode,
  ruleset: zodRuleset,
})
  .refine((v): v is UnionModeRuleset => hasRuleset(v.mode, v.ruleset))

export const zodTipTapJSONContent = record(string(), any())
  .superRefine((input, ctx): input is ArticleProvider.JSONContent => {
    return NEVER
  }) as unknown as ZodSchema<ArticleProvider.JSONContent>

export const zodRankingStatus = nativeEnum(RankingStatus)

export const zodSearchBeatmap = union([
  tuple([
    union([
      literal('bpm'),
      literal('starRating'),
      literal('accuracy'),
      literal('circleSize'),
      literal('approachRate'),
      literal('hpDrain'),
      literal('length'),
    ]),
    union([
      literal('ne'),
      literal('eq'),
      literal('lte'),
      literal('lt'),
      literal('gte'),
      literal('gt'),
    ]),
    number(),
  ]),
  tuple([
    literal('mode'),
    union([
      literal('ne'),
      literal('eq'),
    ]),
    zodMode,
  ]),
])

export const zodFQDN = string().trim().refine((input) => {
  return validator.isFQDN(input)
})

export const zodPath = string().trim().superRefine((val, ctx) => {
  if (!existsSync(val)) {
    ctx.addIssue({
      code: ZodIssueCode.custom,
      message: `invalid path: Guccho cannot access the path you provided: ${val}`,
    })
  }
})

export const zodEmailValidation = union([
  object({
    otp: string(),
    email: string().email(),
  }),
  object({
    token: string().uuid(),
  }),
]) as unknown as ZodSchema<MailTokenProvider.Validation>
