export interface Result<T> {
  code: number
  msg: string | null
  data: T | null
}

export const RESULT_KEYS = ['code', 'msg', 'data'] as const
