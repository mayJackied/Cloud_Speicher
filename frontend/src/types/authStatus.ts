/** 登录/注册业务状态：看 Result.code / Result.msg，不要只看 HTTP。HTTP 一般为 200。 */

export const ResultCode = {
  FAIL: 0,
  OK: 1,
} as const

export const AuthMsg = {
  REGISTER_BAD_INVITE: '无效的邀请码',
  REGISTER_NAME_TAKEN: '用户名已存在',
  LOGIN_BAD_CREDENTIALS: '用户名或密码不正确',
  ACCOUNT_DELETED: '账号已删除',
  NOT_ADMIN: '您不是管理员',
  NOT_LOGIN: 'NOT_LOGIN',
} as const
