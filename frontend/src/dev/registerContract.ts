import { REGISTER_CONTRACT_KEYS, type RegisterDTO, type RegisterResult } from '@/types/auth'

export function isRegisterResult(data: unknown): data is RegisterResult {
  return typeof data === 'boolean'
}

export function extraPayloadKeys(dto: object): string[] {
  return Object.keys(dto).filter(
    (key) => !REGISTER_CONTRACT_KEYS.includes(key as (typeof REGISTER_CONTRACT_KEYS)[number]),
  )
}

export function missingPayloadKeys(dto: Partial<RegisterDTO>): string[] {
  return REGISTER_CONTRACT_KEYS.filter((key) => !(key in dto))
}

export function isProxyFailureBody(data: unknown): boolean {
  return typeof data === 'string' && /ECONNREFUSED|proxy error/i.test(data)
}

function preview(data: unknown): string {
  if (typeof data === 'string') {
    return data.replace(/\s+/g, ' ').slice(0, 180)
  }
  try {
    return JSON.stringify(data).slice(0, 180)
  } catch {
    return Object.prototype.toString.call(data)
  }
}

export function describeRegisterResponse(data: unknown): string {
  if (isRegisterResult(data)) {
    return `形状正确：boolean = ${data}`
  }
  if (isProxyFailureBody(data)) {
    return `还不能验返回契约：Spring 没在 8080 上（Vite 代理失败）。${preview(data)}`
  }
  if (typeof data === 'string') {
    return `形状错误：期望 boolean，实际是 string。正文：${preview(data)}`
  }
  return `形状错误：期望 boolean，实际是 ${typeof data}。正文：${preview(data)}`
}

