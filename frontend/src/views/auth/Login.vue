<template>
  <ArchiveFrame>
    <main class="arc-page">
      <p class="arc-kicker">{{ t('auth.kicker') }}</p>
      <h1>{{ t('auth.signIn') }}</h1>
      <p v-if="message">{{ message }}</p>
      <form @submit.prevent="onSubmit">
        <p>
          <label>
            {{ t('auth.userName') }}
            <input v-model="name" name="name" autocomplete="username" />
          </label>
        </p>
        <p>
          <label>
            {{ t('auth.password') }}
            <input v-model="password" type="password" name="password" autocomplete="current-password" />
          </label>
        </p>
        <p>
          <button type="submit" :disabled="loading">{{ loading ? t('auth.submitting') : t('auth.submit') }}</button>
        </p>
      </form>
      <p><router-link to="/register">{{ t('auth.requestAccess') }}</router-link></p>
      <LocaleSwitch />
    </main>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { login } from '@/api/auth'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { useI18n } from '@/composables/useI18n'
import { describeResult, isResultShape, readLoginVO } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'

const name = ref('')
const password = ref('')
const message = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

async function onSubmit() {
  const dto = {
    name: name.value.trim(),
    password: password.value,
  }
  if (!dto.name || !dto.password) {
    message.value = t('auth.fillAll')
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
    if (data.code === ErrorCode.OK) {
      const vo = readLoginVO(data.data)
      if (!vo) {
        message.value = describeResult(data)
        return
      }
      auth.setSession(vo)
      await router.push({ name: 'drive' })
      return
    }
    message.value = messageForCode(data.code)
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const body = error.response.data
      message.value = isResultShape(body)
        ? messageForCode(body.code)
        : t('auth.loginHttp', { status: error.response.status })
      return
    }
    message.value = t('auth.offline')
  } finally {
    loading.value = false
  }
}
</script>
