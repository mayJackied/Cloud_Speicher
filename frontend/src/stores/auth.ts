import { defineStore } from 'pinia'
import { SESSION_KEY } from '@/api/client'
import { readLoginVO } from '@/dev/contract'
import type { LoginVO } from '@/types/login'

function readSession(): LoginVO | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }
    return readLoginVO(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    session: readSession() as LoginVO | null,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.session?.token) && state.session?.userId != null,
    isAdmin: (state) => Boolean(state.session?.isAdmin),
    user: (state) => state.session,
  },
  actions: {
    setSession(session: LoginVO | null) {
      this.session = session
      if (session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
      } else {
        sessionStorage.removeItem(SESSION_KEY)
      }
    },
    setAdmin(isAdmin: boolean) {
      if (!this.session) {
        return
      }
      this.setSession({ ...this.session, isAdmin })
    },
    logout() {
      this.setSession(null)
    },
  },
})
