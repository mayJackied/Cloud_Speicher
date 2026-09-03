<template>
  <ArchiveFrame>
    <main class="arc-page">
      <p class="arc-kicker">{{ t('auth.kicker') }}</p>
      <h1>{{ t('auth.register') }}</h1>
      <p v-if="message">{{ message }}</p>
      <form @submit.prevent="onSubmit">
        <p>
          <label>
            {{ t('auth.userName') }}
            <input
              v-model="form.name"
              name="name"
              autocomplete="username"
              spellcheck="false"
            />
          </label>
          <span class="arc-hint" :class="nameHintClass">{{ nameHint }}</span>
        </p>
        <p>
          <label>
            {{ t('auth.password') }}
            <input
              v-model="form.password"
              type="password"
              name="password"
              autocomplete="new-password"
            />
          </label>
          <span class="arc-hint" :class="passwordHintClass">{{ passwordHint }}</span>
        </p>
        <p>
          <label>
            {{ t('auth.confirmPassword') }}
            <input
              v-model="form.confirmPassword"
              type="password"
              name="confirmPassword"
              autocomplete="new-password"
            />
          </label>
          <span v-if="confirmHint" class="arc-hint is-live">{{ confirmHint }}</span>
        </p>
        <p>
          <label>
            {{ t('auth.invite') }}
            <input v-model="form.inviteCode" name="inviteCode" spellcheck="false" />
          </label>
          <span v-if="inviteHint" class="arc-hint is-live">{{ inviteHint }}</span>
        </p>
        <p>
          <button type="submit" :disabled="loading">
            {{ loading ? t('auth.submitting') : t('auth.commitRegister') }}
          </button>
        </p>
      </form>
      <p><router-link to="/login">{{ t('auth.goSignIn') }}</router-link></p>
      <p class="arc-hint">{{ t('auth.modeHint') }}</p>
      <ApiModeSwitch />
      <LocaleSwitch />
    </main>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { checkUserName, register } from '@/api/auth'
import ApiModeSwitch from '@/components/ApiModeSwitch.vue'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { useI18n } from '@/composables/useI18n'
import { describeResult, isResultOk, isResultShape, readCheckUserNameVO, readLoginVO } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { NAME_PATTERN, PASSWORD_PATTERN } from '@/types/constraints'
import { ErrorCode, messageForCode } from '@/types/errorCode'

const loading = ref(false)
const submitted = ref(false)
const message = ref('')
const auth = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const form = reactive({
  name: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})

const nameOk = computed(() => NAME_PATTERN.test(form.name.trim()))
const passwordOk = computed(() => PASSWORD_PATTERN.test(form.password))
const confirmOk = computed(() => form.confirmPassword.length > 0 && form.confirmPassword === form.password)
const inviteOk = computed(() => form.inviteCode.trim().length > 0)

const nameHint = computed(() => t('auth.nameRule'))
const passwordHint = computed(() => t('auth.passwordRule'))

const nameHintClass = computed(() => {
  if (!form.name) {
    return ''
  }
  return nameOk.value ? 'is-ok' : 'is-live'
})

const passwordHintClass = computed(() => {
  if (!form.password) {
    return ''
  }
  return passwordOk.value ? 'is-ok' : 'is-live'
})

const confirmHint = computed(() => {
  if (!form.confirmPassword && !submitted.value) {
    return ''
  }
  if (!form.confirmPassword) {
    return t('auth.confirmEmpty')
  }
  return confirmOk.value ? '' : t('auth.confirmMismatch')
})

const inviteHint = computed(() => {
  if (!submitted.value || inviteOk.value) {
    return ''
  }
  return t('error.10009')
})

const formReady = computed(() => nameOk.value && passwordOk.value && confirmOk.value && inviteOk.value)

async function onSubmit() {
  submitted.value = true
  message.value = ''
  if (!formReady.value) {
    message.value = t('auth.fillRegister')
    return
  }

  const dto = {
    name: form.name.trim(),
    password: form.password,
    inviteCode: form.inviteCode.trim(),
  }

  loading.value = true
  try {
    try {
      const checkRes = await checkUserName({ name: dto.name })
      if (isResultOk(checkRes.data)) {
        const vo = readCheckUserNameVO(checkRes.data.data)
        if (vo && !vo.isAvailable) {
          message.value = t('auth.nameTaken')
          return
        }
      }
    } catch {
      // 查重请求失败不挡注册，由 register 自己判。
    }

    const { data } = await register(dto)
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
        : t('auth.registerHttp', { status: error.response.status })
      return
    }
    message.value = t('auth.offline')
  } finally {
    loading.value = false
  }
}
</script>
