import { match } from 'switch-pattern'
import { Monitored } from '../@extends'
import { type Session, type SessionIdType, logger } from '.'

export const sessionConfig = {
  expire: 1000 * 60 * 60 * 24, // 1D
}

export abstract class SessionStore<TSession extends Session<any>, TSessionId extends SessionIdType<TSession> = SessionIdType<TSession>> implements Monitored {
  abstract [Monitored.status]: Monitored[typeof Monitored.status]
  abstract get(key: TSessionId): Promise<Readonly<TSession> | undefined>
  abstract set(key: TSessionId, value: TSession): Promise<[TSessionId, Readonly<TSession>]>
  abstract destroy(key: TSessionId): Promise<boolean>
  abstract forEach(cb: (session: TSession, id: TSessionId) => void | Promise<void>): Promise<void>
  abstract findAll(query: Partial<Pick<TSession, 'OS' | 'userId'>>): Promise<Record<TSessionId, Readonly<TSession>>>
}

export abstract class HouseKeeperSession<TSession extends Session<any>, TSessionId extends SessionIdType<TSession> = SessionIdType<TSession>> extends SessionStore<TSession> implements SessionStore<TSession> {
  #houseKeeping: Partial<Record<'minutely' | 'hourly' | 'daily', (store: SessionStore<TSession>, _config: typeof sessionConfig) => Promise<void>>> = {
    async minutely(this: MemorySessionStore<TSession>, sessionStore) {
      sessionStore.forEach((session, sessionId) => this.#removeIfExpired(session, sessionId))
    },
  }

  constructor() {
    super()
    setInterval(() => this.#houseKeeping.minutely?.call(this, this, sessionConfig), 1000 * 60)
    setInterval(() => this.#houseKeeping.hourly?.call(this, this, sessionConfig), 1000 * 60 * 60)
    setInterval(() => this.#houseKeeping.daily?.call(this, this, sessionConfig), 1000 * 60 * 60 * 24)
  }

  async #removeIfExpired(session: Session, sessionId: TSessionId) {
    if (this.#expired(session)) {
      this.destroy(sessionId)
    }
  }

  #expired(session: Session) {
    return Date.now() - session.lastSeen.getTime() > sessionConfig.expire
  }
}

export class MemorySessionStore<TSession extends Session<any>, TSessionId extends SessionIdType<TSession> = SessionIdType<TSession>> extends HouseKeeperSession<TSession> implements HouseKeeperSession<TSession> {
  private store: Map<TSessionId, TSession>

  [Monitored.status]: Monitored[typeof Monitored.status] = [Monitored.Status.Up, 'Memory Session driver']

  constructor() {
    super()
    logger.warn('Warn: You are using memory session store.')
    this.store = new Map<TSessionId, TSession>()
  }

  async get(key: TSessionId): Promise<TSession | undefined> {
    return this.store.get(key)
  }

  async set(key: TSessionId, value: TSession): Promise<[TSessionId, TSession]> {
    this.store.set(key, value)
    return [key, value]
  }

  async destroy(key: TSessionId): Promise<boolean> {
    return this.store.delete(key)
  }

  async forEach(cb: (session: TSession, id: TSessionId) => void | Promise<void>): Promise<void> {
    return this.store.forEach(cb)
  }

  async findAll(query: Partial<Pick<TSession, 'OS' | 'userId'>>): Promise<Record<TSessionId, TSession>> {
    return Object.fromEntries([...this.store.entries()].filter(([_, s]) => match(s).deepSome(query))) as Record<TSessionId, TSession>
  }
}
