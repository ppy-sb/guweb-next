
declare module '@vlasky/mysql' {
  declare export * from 'mysql'
}

declare module '@rodrigogs/mysql-events' {
  import { Connection } from 'mysql'
  import type ZongJi from 'zongji'
  import { EventEmitter } from 'stream'

  declare const EVENTS = {
    STARTED: 'started',
    STOPPED: 'stopped',
    PAUSED: 'paused',
    RESUMED: 'resumed',
    BINLOG: 'binlog',
    TRIGGER_ERROR: 'triggerError',
    CONNECTION_ERROR: 'connectionError',
    ZONGJI_ERROR: 'zongjiError',
  } as const

  declare const STATEMENTS = {
    ALL: 'ALL',
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  } as const

  type O = NonNullable<Parameters<ZongJi['start']>[0]>

  interface StartOptions extends O {
    excludedSchemas?: Record<string, boolean>
  }

  declare export default class MySQLEvents {
    connection: Connection
    constructor(connection: ConstructorParameters<typeof ZongJi>[0], options?: StartOptions): this
    static get EVENTS(): typeof EVENTS
    static get STATEMENTS(): typeof STATEMENTS
    start(): void
    addTrigger($: {
      name: string,
      expression: string,
      statement: typeof STATEMENTS[keyof typeof STATEMENTS],
      onEvent: (event: RowEvent<any>) => void,
    }): void
    removeTrigger($: {
      name: string,
      expression: string,
      statement: typeof STATEMENTS[keyof typeof STATEMENTS],
    }): void

    on(event: typeof EVENTS[keyof typeof EVENTS], listener: (event: unknown) => void): void
  }

  declare interface BaseEvent {
    schema: string
    table: string

    affectedColumns: string[]
    timestamp: number
    nextPosition: number
    binlogName: unknown
  }

  declare interface InsertEvent<T extends Record<string, any>> extends BaseEvent {
    type: "INSERT"
    affectedRows: Array<{
      after: T
      before: undefined
    }>
  }
  declare interface UpdateEvent<T extends Record<string, any>> extends BaseEvent {
    type: "UPDATE"
    affectedRows: Array<{
      after: T
      before: T
    }>
  }
  declare interface DeleteEvent<T extends Record<string, any>> extends BaseEvent {
    type: "DELETE"
    affectedRows: Array<{
      after: undefined
      before: T
    }>
  }


  export type RowEvent<T extends Record<string, any>> = InsertEvent<T> | UpdateEvent<T> | DeleteEvent<T>

}
