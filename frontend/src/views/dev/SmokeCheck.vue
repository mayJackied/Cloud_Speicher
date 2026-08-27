<template>
  <main>
    <h1>冒烟验证</h1>
    <p>本阶段只验前端：注册页能开、空表单有提示。不要打开 localhost:8080。</p>
    <ul>
      <li v-for="item in checks" :key="item.name">{{ item.ok ? '通过' : '失败' }} — {{ item.name }}{{ item.detail }}</li>
    </ul>
    <p>
      <router-link to="/register">打开注册页</router-link>
      （空提交应出现「请填写用户名、密码和邀请码」；填完提交会走本地 mock，得到成功/失败）
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const checks = computed(() => [
  { ok: true, name: '应用已挂载', detail: '' },
  {
    ok: router.hasRoute('register'),
    name: '路由 /register',
    detail: router.hasRoute('register') ? '' : '：未注册',
  },
  {
    ok: (import.meta.env.VITE_API_BASE_URL || '/api') === '/api',
    name: 'API 基址 /api',
    detail: `（当前 ${import.meta.env.VITE_API_BASE_URL || '/api'}）`,
  },
])
</script>
