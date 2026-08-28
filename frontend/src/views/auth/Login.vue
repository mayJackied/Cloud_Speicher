<template>
  <main>
    <h1>登录</h1>
    <p v-if="message">{{ message }}</p>
    <form @submit.prevent="onSubmit">
      <p>
        <label>
          用户名
          <input v-model="name" name="name" autocomplete="username" />
        </label>
      </p>
      <p>
        <label>
          密码
          <input v-model="password" type="password" name="password" autocomplete="current-password" />
        </label>
      </p>
      <p>
        <button type="submit" :disabled="loading">{{ loading ? '提交中…' : '登录' }}</button>
      </p>
    </form>
    <p><router-link to="/register">去注册</router-link></p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { login } from '@/api/auth'
import { describeResult, isResultShape, readLoginVO } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { AuthMsg, ResultCode } from '@/types/authStatus'

const name = ref('')
const password = ref('')
const message = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
  const dto = {
    name: name.value.trim(),
    password: password.value,
  }
  if (!dto.name || !dto.password) {
    message.value = '请填写用户名和密码'
    return
  }

  loading.value = true
  message.value = ''
  try {
    const { data } = await login(dto)
    if (!isResultShape(data)) {
      message.value = describeResult(data)
      return
    }
    if (data.code === ResultCode.OK) {
      const vo = readLoginVO(data.data)
      if (!vo) {
        message.value = describeResult(data)
        return
      }
      auth.setSession(vo)
      await router.push({ name: 'drive' })
      return
    }
    message.value = data.msg || AuthMsg.LOGIN_BAD_CREDENTIALS
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const body = error.response.data
      message.value = isResultShape(body) ? body.msg || AuthMsg.LOGIN_BAD_CREDENTIALS : `登录失败（HTTP ${error.response.status}）`
      return
    }
    message.value = '无法连接服务器（离线 mock 未生效，或在线 FRP 不通）'
  } finally {
    loading.value = false
  }
}
</script>
