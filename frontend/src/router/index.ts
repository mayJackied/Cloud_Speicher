import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Register from '@/views/auth/Register.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/register' },
  { path: '/register', name: 'register', component: Register },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue'),
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
  )
}

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
