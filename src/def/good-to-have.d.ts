import type { ShallowReactive } from 'vue'

declare global {
  declare type UnwrapShallowReactive<T extends ShallowReactive<any>> = T extends ShallowReactive<infer R> ? R : never
}

declare module 'vue-i18n-routing' {
  import type { CountryCode } from '~/def/country-code'

  interface LocaleObject {
    flag: CountryCode
  }
}

// magical stuff, no touch
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never
type LastOf<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => (infer R) ? R : never

type Push<T extends any[], V> = [...T, V]

type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> =
  true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>

export type ObjValueTuple<T, KS extends any[] = TuplifyUnion<keyof T>, R extends any[] = []> =
  KS extends [infer K, ...infer KT]
    ? ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
    : R
