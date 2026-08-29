export interface Result<T> {
  code: number
  data: T | null
}

export const RESULT_KEYS = ['code', 'data'] as const

export function isResultOk<T>(body: Result<T>): boolean {
  return body.code === 1
}
