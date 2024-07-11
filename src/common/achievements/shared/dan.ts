import { $accGte, $achievement, $and, $beatmapMd5Eq, $extendsAchievement, $modeEq, $noPause, $not, $remark, $usecase, $withStableMod } from '~/common/utils/dan'
import { Mode } from '~/def'
import { Achievement } from '~/def/dan'
import { StableMod } from '~/def/score'

export const _4kDanCommon = $remark(
  '4k dan common',
  $and(
    $modeEq(Mode.Mania),
    $accGte(96),
    $not(
      $withStableMod(
        StableMod.NoFail
        | StableMod.Easy
        | StableMod.HalfTime
        | StableMod['1K']
        | StableMod['2K']
        | StableMod['3K']
        | StableMod['5K']
        | StableMod['6K']
        | StableMod['7K']
        | StableMod['8K']
        | StableMod['9K']
      ),
    ),
  ),
)

export const nonStop = $achievement(
  Achievement.NoPause,
  $and(
    $extendsAchievement(Achievement.Pass),
    $noPause()
  )
)

// const danBaseValidator = {
//   op: OP.Remark,
//   remark: 'dan common',
//   cond: {
//     op: OP.AND,
//     cond: [
//       { op: OP.ModeEq, val: Mode.Mania },
//       { op: OP.AccGte, val: 96 },
//       {
//         op: OP.NOT,
//         cond: {
//           op: OP.OR,
//           cond: [
//             { op: OP.WithMod, val: StableMod.NoFail },
//             { op: OP.WithMod, val: StableMod.Easy },
//             { op: OP.WithMod, val: StableMod.HalfTime },
//           ],
//         },
//       },
//     ],
//   },
// } as const satisfies Cond
//
// const commonNonStop = {
//   achievement: Achievement.NoPause,
//   cond: {
//     op: OP.AND,
//     cond: [
//       {
//         op: OP.Extends,
//         val: Achievement.Pass,
//       },
//       { op: OP.NoPause },
//     ],
//   },
// } as const satisfies AchievementBinding<Achievement.NoPause, Cond>
