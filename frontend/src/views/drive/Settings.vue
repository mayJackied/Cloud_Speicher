<template>
  <main>
    <h1>设置</h1>
    <p>已登录：{{ auth.user?.name }}（id {{ auth.user?.userId }}{{ auth.user?.isAdmin ? '，管理员' : '' }}）</p>
    <h2>删除账号</h2>
    <p>输入当前用户名以确认。删除后需重新邀请注册。</p>
    <p>
      <label>
        用户名
        <input v-model="confirmName" autocomplete="off" />
      </label>
    </p>
    <p>
      <button type="button" :disabled="loading" @click="onDelete">删除账号</button>
    </p>
    <p v-if="message">{{ message }}</p>
    <p><router-link to="/drive">返回网盘</router-link></p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { deleteUser } from '@/api/auth'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'

const auth = useAuthStore()
const router = useRouter()
const confirmName = ref('')
const loading = ref(false)
const message = ref('')

async function onDelete() {
  const expected = auth.user?.name ?? ''
  if (!expected || confirmName.value.trim() !== expected) {
    message.value = '请输入当前用户名以确认删除'
    return
  }
  loading.value = true
  message.value = ''
  try {
    const { data } = await deleteUser()
    if (!isResultShape(data)) {
      message.value = '返回不是 Result'
      return
    }
    if (data.code !== ErrorCode.OK) {
      message.value = messageForCode(data.code)
      return
    }
    auth.logout()
    await router.push({ name: 'login' })
  } catch (error) {
    if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
      message.value = messageForCode(error.response.data.code)
      return
    }
    message.value = '无法连接服务器'
  } finally {
    loading.value = false
  }
}
</script>
