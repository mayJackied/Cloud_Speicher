import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as { userId: number; name: string; role: string } | null,
    accessToken: '',
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.accessToken || state.user),
  },
})
