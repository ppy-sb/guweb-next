import { Mode } from '~/def'
import { Achievement, type AchievementBinding, type Cond, OP, type Usecase } from '~/def/dan'
import { StableMod } from '~/def/score'

const danBaseValidator = {
  op: OP.Commented,
  remark: 'dan common',
  cond: {
    op: OP.AND,
    cond: [
      { op: OP.ModeEq, val: Mode.Mania },
      { op: OP.AccGte, val: 96 },
      {
        op: OP.NOT,
        cond: {
          op: OP.OR,
          cond: [
            { op: OP.WithMod, val: StableMod.NoFail },
            { op: OP.WithMod, val: StableMod.Easy },
            { op: OP.WithMod, val: StableMod.HalfTime },
          ],
        },
      },
    ],
  },
} as const satisfies Cond

const commonNonStop = {
  achievement: Achievement.NoPause,
  cond: {
    op: OP.AND,
    cond: [
      {
        op: OP.Extends,
        val: Achievement.Pass,
      },
      { op: OP.NoPause },
    ],
  },
} as const satisfies AchievementBinding<Achievement.NoPause, Cond>

export const rf9 = {
  id: 1,
  name: 'rf9',
  description: 'rf9',
  achievements: [
    {
      achievement: Achievement.Pass,
      cond: {
        op: OP.AND,
        cond: [
          danBaseValidator,
          {
            op: OP.BeatmapMd5Eq,
            val: 'd25a4b3fde5bc764d259b1bac6a7671c',
          },
        ],
      },
    },
    commonNonStop,
  ],
} as const satisfies Usecase

export const rf10 = {
  id: 1,
  name: 'rf10',
  description: 'rf10',
  achievements: [
    {
      achievement: Achievement.Pass,
      cond: {
        op: OP.AND,
        cond: [
          danBaseValidator,
          {
            op: OP.OR,
            cond: [
              { op: OP.BeatmapMd5Eq, val: '1e0310955d28145ca287112360d162e8' },
              { op: OP.BeatmapMd5Eq, val: '不同版本的同一套图' },
              { op: OP.BanchoBeatmapIdEq, val: 123456788 },
            ],
          },
        ],
      },
    },
    commonNonStop,
  ],
} as const satisfies Usecase

export const testDB = {
  id: -1,
  name: 'test',
  description: 'test',
  achievements: [
    {
      achievement: Achievement.Pass,
      cond: {
        op: OP.AND,
        cond: [
          danBaseValidator,
          {
            op: OP.BeatmapMd5Eq,
            val: '9194fda7f829217a9943a5bdf3bf9c59',
          },
        ],
      },
    },
    commonNonStop,
  ],
} as const satisfies Usecase
