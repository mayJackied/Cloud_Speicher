<template>
  <ArchiveFrame>
    <main class="arc-page">
      <p class="arc-kicker">ARCHIVAL_CLOUD_SYSTEM</p>
      <h1>{{ t('invite.title') }}</h1>
      <p v-if="message">{{ message }}</p>
      <p>
        <button type="button" :disabled="loading" @click="onCreate">{{ t('invite.issue') }}</button>
      </p>
      <p v-if="code">{{ t('invite.newCode') }}: {{ code }}</p>
      <p><router-link to="/drive">{{ t('settings.back') }}</router-link></p>
    </main>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import { useI18n } from '@/composables/useI18n'
import { creatInviteCode } from '@/api/invitations'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import type { CreatInviteCodeVO } from '@/types/invite'

const auth = useAuthStore()
const { t } = useI18n()
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
        auth.setAdmin(true)
        code.value = vo.inviteCode
        message.value = '已生成'
        return
      }
    }
    if (data.code === ErrorCode.NOT_ADMIN) {
      auth.setAdmin(false)
    }
    message.value = messageForCode(data.code)
  } catch (error) {
    if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
      if (error.response.data.code === ErrorCode.NOT_ADMIN) {
        auth.setAdmin(false)
      }
      message.value = messageForCode(error.response.data.code)
      return
    }
    message.value = '无法连接服务器'
  } finally {
    loading.value = false
  }
}
</script>
