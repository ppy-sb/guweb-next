export * from './admin'
export * from './asserts'
export * from './enum'
export * from './error'
export * from './guards'
export * from './layer'
export * from './level'
export * from './locale-path'
export * as localeKey from './locales'
export * from './map'
export * from './roles'

export function noop<T extends undefined | void = void>(): T
export function noop(): void {}

export function TSFilter<T>(item: T): item is NonNullable<T> {
  return item !== undefined && item !== null
}

export function pick<T extends Record<any, any>, K extends keyof T>(record: T, keys: K[]) {
  return keys.reduce<Partial<T>>((acc, cur) => {
    acc[cur] = record[cur]
    return acc
  }, {}) as { [P in K]: T[P]; }
}

export function capitalizeFirstLetter<T extends string>(string: T) {
  return (string.charAt(0).toUpperCase() + string.slice(1)) as Capitalize<T>
}

export function lazySingleton<TArg, TRet, TFac extends (...args: readonly TArg[]) => TRet>(factory: TFac) {
  let singleton: TRet
  let ready = false
  return ((...args: readonly TArg[]) => {
    if (ready) {
      return singleton
    }
    singleton = factory(...args)
    ready = true
    return singleton
  }) as TFac
}

export function raise<E extends new(...con: any[]) => Error>(Constructor: E, ...params: ConstructorParameters<E>): never {
  throw new Constructor(...params)
}

export function raiseError<E>(e: E): never {
  throw e
}

export function createOptions<T extends Record<string, string>, TTr extends (key: keyof T, value: T[keyof T]) => string>(priv: T, createLabel: TTr = ((a: keyof T) => a) as unknown as TTr) {
  return Object.entries(priv).map(([label, value]) => ({ label: createLabel(label, value as T[keyof T]), value: value as unknown as T[keyof T] }))
}
