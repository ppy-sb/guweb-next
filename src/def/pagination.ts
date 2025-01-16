export interface Pagination {
  page: number
}
// eslint-disable-next-line antfu/no-const-enum
export const enum Paginated {
  Count,
  Data,
}

/**
 * @deprecated use `PaginatedResult`
 */
export interface PaginatedResultTuple<T> {
  [Paginated.Count]: number
  [Paginated.Data]: T[]
}

export interface PaginatedResult<T> {
  total: number
  data: T[]
}
