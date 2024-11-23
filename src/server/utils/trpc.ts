import { type ProcedureBuilder, TRPCError } from '@trpc/server'
import { features } from '$active'
import { type Feature } from '~/def/features'

// import { GucchoError } from '~/def/messages'

export function withFeatureFlag<T extends ProcedureBuilder<any>>(p: T, featureFlag: Feature): T extends ProcedureBuilder<infer U> ? ReturnType<ProcedureBuilder<U>['use']> : never {
  const _: any = p.use(({ next }) => {
    if (!features.has(featureFlag)) {
      throw new TRPCError({ message: 'Featrure not supported', code: 'NOT_IMPLEMENTED' })
    }
    return next()
  })
  return _
}
