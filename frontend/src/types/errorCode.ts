/** 与 backend `ErrorCode` / `conteact/ErrorCode.md` 对齐。失败时 Result.code 就是这些整数；前端自己查表显示文案（方便以后多语言）。 */

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
  NO_PERMISSION: 20001,
  FILE_OPERATION_FAILED: 20002,
  FILE_NAME_ILLEGAL: 20003,
  FILE_NOT_FOUND: 20004,
  FILE_ILLEGAL: 20005,
  FILE_DUPLICATE: 20006,
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

const ZH: Record<number, string> = {
  [ErrorCode.EXCEPTION]: '后端处理错误',
  [ErrorCode.NOT_LOGIN]: '没有登录',
  [ErrorCode.USER_NOT_FOUND]: '没有此账号',
  [ErrorCode.NOT_ADMIN]: '您不是管理员',
  [ErrorCode.USERNAME_EMPTY]: '用户名不能为空',
  [ErrorCode.USERNAME_LENGTH_INVALID]: '用户名长度必须为3-20位',
  [ErrorCode.USERNAME_FORMAT_INVALID]: '用户名必须以字母开头，且只能包含字母、数字和下划线',
  [ErrorCode.PASSWORD_EMPTY]: '密码不能为空',
  [ErrorCode.PASSWORD_LENGTH_INVALID]: '密码长度必须为8-64位',
  [ErrorCode.PASSWORD_FORMAT_INVALID]: '密码必须同时包含字母和数字，且只能包含字母和数字',
  [ErrorCode.INVITE_CODE_EMPTY]: '邀请码不能为空',
  [ErrorCode.INVITE_CODE_INVALID]: '无效的邀请码',
  [ErrorCode.USERNAME_OR_PASSWORD_INVALID]: '用户名或密码不正确',
  [ErrorCode.DELETE_USER_FAILED]: '删除用户失败',
  [ErrorCode.NO_PERMISSION]: '您没有权限操作此文件',
  [ErrorCode.FILE_OPERATION_FAILED]: '文件操作失败',
  [ErrorCode.FILE_NAME_ILLEGAL]: '文件名不合法',
  [ErrorCode.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCode.FILE_ILLEGAL]: '文件不符合约定',
  [ErrorCode.FILE_DUPLICATE]: '存在同名文件',
}

export function messageForCode(code: number): string {
  if (code === ErrorCode.OK) {
    return ''
  }
  return ZH[code] ?? `错误码 ${code}`
}
