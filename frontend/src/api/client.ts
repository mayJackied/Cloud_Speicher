import axios from 'axios'
import { ErrorCode } from '@/types/errorCode'
import type { LoginVO } from '@/types/login'

export const SESSION_KEY = 'loginVO'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
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

api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // 实例默认是 application/json。不删掉的话 Spring 不会按 multipart 绑 path/file，
    // checkFilePermission 就会变成 20001 / 20004。
    const headers = config.headers
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type')
      headers.delete('content-type')
    } else if (headers) {
      delete headers['Content-Type']
      delete headers['content-type']
    }
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
    const url = response.config.url ?? ''
    if (!isNoJwtUrl(url) && isSessionDead(response.data)) {
      kickToLogin()
    }
    return response
  },
  (error) => {
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    if (axios.isAxiosError(error) && !isNoJwtUrl(url) && isSessionDead(error.response?.data)) {
      kickToLogin()
    }
    return Promise.reject(error)
  },
)
