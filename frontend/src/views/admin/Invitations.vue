<template>
  <main>
    <h1>邀请码</h1>
    <p v-if="message">{{ message }}</p>
    <p>
      <button type="button" :disabled="loading" @click="onCreate">生成邀请码</button>
    </p>
    <p v-if="code">新邀请码：{{ code }}</p>
    <p><router-link to="/drive">返回网盘</router-link></p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { creatInviteCode } from '@/api/invitations'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import type { CreatInviteCodeVO } from '@/types/invite'

const auth = useAuthStore()
const loading = ref(false)
const message = ref('')
const code = ref('')

async function onCreate() {
  if (!auth.user) {
    return
  }
  loading.value = true
  message.value = ''
  try {
    const { data } = await creatInviteCode()
    if (!isResultShape(data)) {
      message.value = '返回不是 Result'
      return
    }
    if (data.code === ErrorCode.OK) {
      const vo = data.data as CreatInviteCodeVO | null
      if (vo?.inviteCode) {
        code.value = vo.inviteCode
        message.value = '已生成'
        return
      }
    }
    message.value = messageForCode(data.code)
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
