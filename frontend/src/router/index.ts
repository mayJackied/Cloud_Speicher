import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Register from '@/views/auth/Register.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/drive' },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: { guestOnly: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/drive',
    name: 'drive',
    component: () => import('@/views/drive/Home.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/invitations',
    name: 'admin-invitations',
    component: () => import('@/views/admin/Invitations.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

if (import.meta.env.DEV) {
  routes.push(
    {
      path: '/dev/contract',
      name: 'dev-contract',
      component: () => import('@/views/dev/ContractCheck.vue'),
    },
    {
      path: '/dev/smoke',
      name: 'dev-smoke',
      component: () => import('@/views/dev/SmokeCheck.vue'),
    },
    {
      path: '/dev/hasher',
      name: 'dev-hasher',
      component: () => import('@/views/dev/HasherCheck.vue'),
    },
  )
}

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'drive' }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'drive' }
  }
  return true
})

export default router
