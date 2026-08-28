import axios from 'axios'
import type { LoginVO } from '@/types/login'

export const SESSION_KEY = 'loginVO'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 25000,
})

const NO_JWT = ['/user/login', '/user/register', '/user/getUsersName']

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

function isNotLogin(data: unknown): boolean {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'msg' in data &&
      (data as { msg?: string }).msg === 'NOT_LOGIN',
  )
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
    if (!isNoJwtUrl(url) && isNotLogin(response.data)) {
      kickToLogin()
    }
    return response
  },
  (error) => {
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : ''
    if (axios.isAxiosError(error) && !isNoJwtUrl(url) && isNotLogin(error.response?.data)) {
      kickToLogin()
    }
    return Promise.reject(error)
  },
)
