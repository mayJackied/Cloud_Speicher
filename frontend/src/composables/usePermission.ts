import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const auth = useAuthStore()
  const isLoggedIn = computed(() => auth.isLoggedIn)
  const isAdmin = computed(() => auth.isAdmin)
  return { isLoggedIn, isAdmin }
}
