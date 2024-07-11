import {
  $accGte,
  $achievement,
  $and,
  $beatmapMd5Eq,
  $extendsAchievement,
  $modeEq,
  $noPause,
  $not,
  $remark,
  $usecase,
  $withStableMod,
} from '~/common/utils/dan'
import { Mode } from '~/def'
import { Achievement } from '~/def/dan'
import { StableMod } from '~/def/score'

export default $usecase('Dan ~ REFORM ~ 1st Pack', {
  id: -1,
  description: '6th dan',
  achievements: [
    $achievement(
      Achievement.Pass,
      $and(
        $remark(
          '~ 6th ~ (Marathon)',
          $beatmapMd5Eq('a0aeefe2f623c17a243ebba8a09a50e8')
        ),
        $remark(
          '4k dan common, you can use _4kDanCommon in ./shared/dan',
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
              )
            )
          )
        )
      )
    ),

    // you can use nonStop in ./shared/dan
    $achievement(
      Achievement.NoPause,
      $and($extendsAchievement(Achievement.Pass), $noPause())
    ),
  ],
})
