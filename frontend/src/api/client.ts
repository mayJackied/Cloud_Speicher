import axios, { type AxiosHeaders } from 'axios'
import { noteLinkFailure, noteLinkSuccess } from '@/api/linkHealth'
import { ErrorCode } from '@/types/errorCode'
import type { LoginVO } from '@/types/login'

export const SESSION_KEY = 'loginVO'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    Accept: 'application/json',
    'Accept-Charset': 'UTF-8',
  },
  timeout: 25000,
})

const NO_JWT = ['/user/login', '/user/register', '/user/checkUserName']

function isNoJwtUrl(url: string): boolean {
  return NO_JWT.some((path) => url.includes(path))
}

function readToken(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) {
      return ''
    }
    const vo = JSON.parse(raw) as LoginVO
    return vo.token || ''
  } catch {
    return ''
  }
}

function readApiMode(): string {
  try {
    return localStorage.getItem('apiMode') === 'online' ? 'online' : 'offline'
  } catch {
    return 'offline'
  }
}

function isSessionDead(data: unknown): boolean {
  if (!data || typeof data !== 'object' || !('code' in data)) {
    return false
  }
  const code = (data as { code?: number }).code
  return code === ErrorCode.NOT_LOGIN || code === ErrorCode.BLACKLISTED_JWT
}

function kickToLogin() {
  sessionStorage.removeItem(SESSION_KEY)
  const path = window.location.pathname
  if (path.startsWith('/login') || path.startsWith('/register')) {
    return
  }
  window.location.assign('/login')
}

export function isFormDataBody(data: unknown): data is FormData {
  return typeof FormData !== 'undefined' && data instanceof FormData
}

/** false = axios 不要写 Content-Type，让浏览器带 multipart boundary。 */
export function dropJsonContentType(headers: unknown) {
  if (!headers || typeof headers !== 'object') {
    return
  }
  const typed = headers as AxiosHeaders & Record<string, unknown>
  if (typeof typed.setContentType === 'function') {
    typed.setContentType(false)
    return
  }
  delete typed['Content-Type']
  delete typed['content-type']
}

api.interceptors.request.use((config) => {
  if (isFormDataBody(config.data)) {
    dropJsonContentType(config.headers)
  } else if (
    config.data != null &&
    config.headers &&
    typeof config.headers.setContentType === 'function' &&
    !config.headers.get('Content-Type')
  ) {
    config.headers.setContentType('application/json; charset=UTF-8')
  }
  const url = config.url ?? ''
  const token = readToken()
  if (!isNoJwtUrl(url) && token) {
    config.headers.token = token
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    noteLinkSuccess(response.data)
    const url = response.config.url ?? ''
    if (!isNoJwtUrl(url) && isSessionDead(response.data)) {
      kickToLogin()
    }
    return response
  },
  (error) => {
    noteLinkFailure(error)
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    if (axios.isAxiosError(error) && !isNoJwtUrl(url) && isSessionDead(error.response?.data)) {
      kickToLogin()
    }
    return Promise.reject(error)
  },
)

function resolveApiUrl(path: string, params?: Record<string, string>): string {
  const base = String(api.defaults.baseURL || '/api').replace(/\/$/, '')
  const rel = path.startsWith('/') ? path : `/${path}`
  const query = params ? new URLSearchParams(params).toString() : ''
  return `${base}${rel}${query ? `?${query}` : ''}`
}

/**
 * 上传走浏览器原生 FormData。axios 默认 JSON Content-Type 会让 Spring
 * MultipartResolver 报 Failed to get request parts，前端再显示「文件不存在」。
 * 必须有超时：否则回收站元数据上传挂起时会把整个网盘卡在 loading。
 */
export async function postForm<T>(
  path: string,
  body: FormData,
  params?: Record<string, string>,
  opts?: { timeoutMs?: number },
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const token = readToken()
  if (token) {
    headers.token = token
  }
  headers['X-Api-Mode'] = readApiMode()

  const timeoutMs = opts?.timeoutMs ?? 60000
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)

  try {
    const response = await fetch(resolveApiUrl(path, params), {
      method: 'POST',
      headers,
      body,
      signal: ctrl.signal,
    })
    const data = (await response.json()) as T
    noteLinkSuccess(data)
    if (!isNoJwtUrl(path) && isSessionDead(data)) {
      kickToLogin()
    }
    return { data, status: response.status, statusText: response.statusText }
  } catch (error) {
    noteLinkFailure(error)
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}
