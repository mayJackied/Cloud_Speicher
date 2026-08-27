<template>
  <main>
    <h1>注册</h1>
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
          <input v-model="password" type="password" name="password" autocomplete="new-password" />
        </label>
      </p>
      <p>
        <label>
          邀请码
          <input v-model="inviteCode" name="inviteCode" />
        </label>
      </p>
      <p>
        <button type="submit" :disabled="loading">{{ loading ? '提交中…' : '注册' }}</button>
      </p>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { register } from '@/api/auth'
import { isRegisterResult } from '@/dev/registerContract'

const name = ref('')
const password = ref('')
const inviteCode = ref('')
const message = ref('')
const loading = ref(false)

async function onSubmit() {
  const dto = {
    name: name.value.trim(),
    password: password.value,
    inviteCode: inviteCode.value.trim(),
  }
  if (!dto.name || !dto.password || !dto.inviteCode) {
    message.value = '请填写用户名、密码和邀请码'
    return
  }

  loading.value = true
  message.value = ''
  try {
    const { data } = await register(dto)
    if (!isRegisterResult(data)) {
      message.value = '注册失败：服务器返回格式不是 boolean'
      return
    }
    message.value = data ? '注册成功' : '注册失败'
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const data = error.response.data
      if (isRegisterResult(data)) {
        message.value = data ? '注册成功' : '注册失败'
      } else {
        message.value = `注册失败（HTTP ${error.response.status}）`
      }
      return
    }
    message.value = '无法连接服务器，请确认后端已启动'
  } finally {
    loading.value = false
  }
}
</script>
