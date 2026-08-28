<template>
  <main>
    <h1>网盘</h1>
    <p>已登录：{{ auth.user?.name }}（id {{ auth.user?.userId }}）</p>
    <p v-if="isAdmin">管理员</p>
    <p v-if="isAdmin"><router-link to="/admin/invitations">发邀请码</router-link></p>
    <p>
      <button type="button" @click="onLogout">退出</button>
    </p>
    <p>文件列表等文件接口后再做。登录态已带请求头 token。</p>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

const auth = useAuthStore()
const { isAdmin } = usePermission()
const router = useRouter()

function onLogout() {
  auth.logout()
  void router.push({ name: 'login' })
}
</script>
