/** 与 backend `ErrorCode` / `conteact/ErrorCode.md` 对齐。失败时 Result.code 就是这些整数；前端自己查表显示文案（方便以后多语言）。 */

import { lookupMessage, type Locale } from '@/i18n/messages'
import { detectLocale } from '@/stores/locale'

export const ErrorCode = {
  OK: 1,
  EXCEPTION: 99999,
  NOT_LOGIN: 10000,
  USER_NOT_FOUND: 10001,
  NOT_ADMIN: 10002,
  USERNAME_EMPTY: 10003,
  USERNAME_LENGTH_INVALID: 10004,
  USERNAME_FORMAT_INVALID: 10005,
  PASSWORD_EMPTY: 10006,
  PASSWORD_LENGTH_INVALID: 10007,
  PASSWORD_FORMAT_INVALID: 10008,
  INVITE_CODE_EMPTY: 10009,
  INVITE_CODE_INVALID: 10010,
  USERNAME_OR_PASSWORD_INVALID: 10011,
  DELETE_USER_FAILED: 10012,
  BLACKLISTED_JWT: 10013,
  NO_PERMISSION: 20001,
  FILE_OPERATION_FAILED: 20002,
  FILE_NAME_ILLEGAL: 20003,
  FILE_NOT_FOUND: 20004,
  FILE_ILLEGAL: 20005,
  FILE_DUPLICATE: 20006,
  BIN_FILE_NOT_ALLOWED: 20007,
  UPLOAD_KEY_NOT_FOUND: 20008,
  FILE_STARRED: 20009,
  ARGS_ILLEGAL: 30001,
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

export function messageForCode(code: number, locale?: Locale): string {
  if (code === ErrorCode.OK) {
    return ''
  }
  const lang = locale ?? detectLocale()
  const mapped = lookupMessage(lang, `error.${code}`)
  if (mapped !== `error.${code}`) {
    return mapped
  }
  return lang === 'zh-CN' ? `错误码 ${code}` : `Error ${code}`
}
