import { LOGIN_DTO_KEYS, REGISTER_DTO_KEYS, type LoginDTO, type RegisterDTO } from '@/types/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import type { LoginVO } from '@/types/login'
import type { Result } from '@/types/result'
import type { CheckUserNameVO } from '@/types/user'

export function extraKeys(obj: object, allowed: readonly string[]): string[] {
  return Object.keys(obj).filter((key) => !allowed.includes(key))
}

export function missingKeys(obj: object, required: readonly string[]): string[] {
  return required.filter((key) => !(key in obj))
}

export function extraRegisterKeys(dto: object): string[] {
  return extraKeys(dto, REGISTER_DTO_KEYS)
}

export function missingRegisterKeys(dto: Partial<RegisterDTO>): string[] {
  return missingKeys(dto, REGISTER_DTO_KEYS)
}

export function extraLoginKeys(dto: object): string[] {
  return extraKeys(dto, LOGIN_DTO_KEYS)
}

export function missingLoginKeys(dto: Partial<LoginDTO>): string[] {
  return missingKeys(dto, LOGIN_DTO_KEYS)
}

export function isProxyFailureBody(data: unknown): boolean {
  return typeof data === 'string' && /ECONNREFUSED|proxy error|ETIMEDOUT|ENOTFOUND/i.test(data)
}

function preview(data: unknown): string {
  if (typeof data === 'string') {
    return data.replace(/\s+/g, ' ').slice(0, 180)
  }
  try {
    return JSON.stringify(data).slice(0, 220)
  } catch {
    return Object.prototype.toString.call(data)
  }
}

function asRecord(data: unknown): Record<string, unknown> | null {
  return data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

/** 登录 JSON 里 is_admin 可能是 true / 1 / "true"。 */
export function readBoolish(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) {
      return true
    }
    if (value === 0) {
      return false
    }
    return null
  }
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase()
    if (n === 'true' || n === '1' || n === 'yes') {
      return true
    }
    if (n === 'false' || n === '0' || n === 'no') {
      return false
    }
  }
  return null
}

export function isResultShape(data: unknown): data is Result<unknown> {
  const row = asRecord(data)
  if (!row) {
    return false
  }
  return typeof row.code === 'number' && Number.isFinite(row.code) && 'data' in row
}

export function isResultOk(data: unknown): data is Result<unknown> {
  return isResultShape(data) && data.code === ErrorCode.OK
}

export function readLoginVO(data: unknown): LoginVO | null {
  const row = asRecord(data)
  if (!row) {
    return null
  }
  const token = readString(row.token)
  const userId = readNumber(row.userId ?? row.user_id)
  const name = readString(row.name)
  if (!token || userId === null || name === null) {
    return null
  }
  return {
    token,
    userId,
    name,
    isAdmin:
      readBoolish(row.isAdmin ?? row.admin ?? row.is_admin ?? row.isadmin) ?? false,
  }
}

export function readCheckUserNameVO(data: unknown): CheckUserNameVO | null {
  const row = asRecord(data)
  if (!row) {
    return null
  }
  const available = readBoolean(row.isAvailable ?? row.is_available ?? row.available)
  if (available === null) {
    return null
  }
  return { isAvailable: available }
}

export function describeTransportError(opts: {
  status?: number
  data?: unknown
  message?: string
}): string {
  const { status, data, message } = opts
  if (status != null) {
    if (isProxyFailureBody(data)) {
      return `HTTP ${status}：代理连不上后端（FRP/8080 不可达）。${preview(data)}`
    }
    if (status >= 500) {
      return `HTTP ${status}：已打到对端，但服务器或代理报错（不是超时）。${describeResult(data, 'none')}`
    }
    return `HTTP ${status}；${describeResult(data)}`
  }
  if (message && /timeout|ECONNREFUSED|ENOTFOUND|Network Error|ETIMEDOUT/i.test(message)) {
    return `在线未连通：${message}`
  }
  return message ? `请求失败：${message}` : '请求失败'
}

export function describeResult(data: unknown, expectVo: 'LoginVO' | 'none' = 'LoginVO'): string {
  if (isProxyFailureBody(data)) {
    return `在线未连通（FRP/后端不可达）。${preview(data)}`
  }
  if (!isResultShape(data)) {
    return `形状错误：期望 Result{code,data}，实际：${preview(data)}`
  }
  const codePart = `code=${data.code}`
  if (data.code !== ErrorCode.OK) {
    return `Result 形状正确（失败）：${codePart} ${messageForCode(data.code)} data=${preview(data.data)}`
  }
  if (expectVo === 'LoginVO') {
    const vo = readLoginVO(data.data)
    if (!vo) {
      return `Result 外壳正确，但 data 不是 LoginVO（需要 token, userId, name, isAdmin/is_admin）。实际：${preview(data.data)}`
    }
    return `Result 形状正确：${codePart} LoginVO={userId:${vo.userId}, name:${vo.name}, isAdmin:${vo.isAdmin}, token:…}`
  }
  return `Result 形状正确：${codePart}`
}

export function fixtureSuccessLogin(name = 'alice'): Result<LoginVO> {
  return {
    code: ErrorCode.OK,
    data: {
      token: 'mock-token',
      userId: 1,
      name,
      isAdmin: false,
    },
  }
}

export function fixtureFail(code: number = ErrorCode.INVITE_CODE_INVALID): Result<null> {
  return { code, data: null }
}

export { LOGIN_VO_KEYS } from '@/types/login'
