<template>
  <main>
    <h1>冒烟验证</h1>
    <p>
      模式：
      <label><input v-model="modeModel" type="radio" value="offline" /> 离线</label>
      <label><input v-model="modeModel" type="radio" value="online" /> 在线（FRP，不一定通）</label>
    </p>
    <ul>
      <li v-for="item in checks" :key="item.name">
        {{ item.ok ? '通过' : '失败' }} — {{ item.name }}{{ item.detail }}
      </li>
    </ul>
    <p>
      <router-link to="/register">注册页</router-link>
      ｜
      <router-link to="/login">登录页</router-link>
    </p>
    <p>
      <button type="button" :disabled="loading" @click="runSmoke">跑本模式冒烟</button>
    </p>
    <p>{{ smokeText }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { login, register } from '@/api/auth'
import { useApiMode } from '@/composables/useApiMode'
import { isResultShape, readLoginVO, describeTransportError } from '@/dev/contract'

const router = useRouter()
const { mode, setMode } = useApiMode()
const modeModel = computed({
  get: () => mode.value,
  set: (value: 'offline' | 'online') => setMode(value),
})
const loading = ref(false)
const smokeText = ref('尚未跑')

const checks = computed(() => [
  { ok: true, name: '应用已挂载', detail: '' },
  {
    ok: router.hasRoute('register') && router.hasRoute('login'),
    name: '路由 /register /login',
    detail: '',
  },
  {
    ok: (import.meta.env.VITE_API_BASE_URL || '/api') === '/api',
    name: 'API 基址 /api',
    detail: `（当前 ${import.meta.env.VITE_API_BASE_URL || '/api'}）`,
  },
])

async function runSmoke() {
  loading.value = true
  smokeText.value = '请求中…'
  try {
    const payload =
      mode.value === 'offline'
        ? { name: 'smokeuser', password: 'password1', inviteCode: 'K7M2Q9' }
        : { name: '__smoke__', password: '__smoke__', inviteCode: '__smoke__' }
    const { data: registerBody } = await register(payload)
    const { data: loginBody } = await login({ name: payload.name, password: payload.password })
    const registerOk = isResultShape(registerBody)
    const loginOk = isResultShape(loginBody)
    const registerVo = registerOk && registerBody.code === 1 ? readLoginVO(registerBody.data) : null
    const loginVo = loginOk && loginBody.code === 1 ? readLoginVO(loginBody.data) : null
    if (mode.value === 'offline') {
      smokeText.value =
        registerOk && loginOk && registerBody.code === 1 && loginBody.code === 1 && registerVo && loginVo
          ? '离线冒烟通过：register/login 均为 Result code=1 且 data 为 LoginVO'
          : `离线冒烟失败：register=${JSON.stringify(registerBody)} login=${JSON.stringify(loginBody)}`
      return
    }
    smokeText.value =
      registerOk && loginOk
        ? `在线冒烟：两端都是 Result（register code=${registerBody.code}, login code=${loginBody.code}${
            loginVo ? '，LoginVO 已识别' : ''
          }）`
        : '在线通了但返回不是 Result'
  } catch (error) {
    if (isAxiosError(error)) {
      smokeText.value = describeTransportError({
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
      return
    }
    smokeText.value = mode.value === 'online' ? '在线请求失败' : '离线 mock 未响应，请确认 npm run dev'
  } finally {
    loading.value = false
  }
}
</script>
