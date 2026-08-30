<template>
  <main>
    <h1>契约验证</h1>
    <p>
      模式：
      <label><input v-model="modeModel" type="radio" value="offline" /> 离线（本地 mock）</label>
      <label><input v-model="modeModel" type="radio" value="online" /> 在线（{{ onlineTarget }}，FRP 不一定通）</label>
    </p>
    <p><strong>离线契约：{{ offlinePass ? '通过' : '失败' }}</strong></p>
    <p v-if="mode === 'online'"><strong>在线探测：{{ onlineText }}</strong></p>

    <h2>1. RegisterDTO</h2>
    <pre>{{ registerJson }}</pre>
    <p>缺字段：{{ registerMissing }}　多余：{{ registerExtra }}</p>

    <h2>2. LoginDTO</h2>
    <pre>{{ loginJson }}</pre>
    <p>缺字段：{{ loginMissing }}　多余：{{ loginExtra }}</p>

    <h2>3. Result 夹具（离线）</h2>
    <p>成功 → {{ successText }}</p>
    <p>失败 → {{ failText }}</p>

    <h2>4. 打接口</h2>
    <p>离线走 mock；在线经 Vite 转到 8.130.215.175:8080。login / register / checkUserName 不带 JWT；发邀请码 GET，只带头 token（用户 id 在 JWT 里）。getFiles 也要 token，成功应是 public + 自己的房间两棵树。</p>
    <p>当前会话：{{ sessionText }}。发码成功路径：用户名填 admin，先探测 login，再点 creatInviteCode。非管理员应得到 code=10002。</p>
    <p>
      <label>用户名 <input v-model="name" /></label>
    </p>
    <p>
      <label>密码 <input v-model="password" type="password" /></label>
    </p>
    <p>
      <label>邀请码 <input v-model="inviteCode" /></label>
    </p>
    <p>
      <button type="button" :disabled="loading" @click="probeRegister">探测 register</button>
      <button type="button" :disabled="loading" @click="probeLogin">探测 login</button>
      <button type="button" :disabled="loading" @click="probeInvite">探测 creatInviteCode</button>
      <button type="button" :disabled="loading" @click="probeFiles">探测 getFiles</button>
    </p>
    <p>{{ probeText }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { login, register } from '@/api/auth'
import { creatInviteCode } from '@/api/invitations'
import { getFiles } from '@/api/files'
import { useApiMode } from '@/composables/useApiMode'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode } from '@/types/errorCode'
import {
  describeResult,
  describeTransportError,
  extraLoginKeys,
  extraRegisterKeys,
  fixtureFail,
  fixtureSuccessLogin,
  isResultShape,
  missingLoginKeys,
  missingRegisterKeys,
  readLoginVO,
} from '@/dev/contract'
import { readFilesVOList } from '@/types/file'

const auth = useAuthStore()
const { mode, setMode } = useApiMode()
const modeModel = computed({
  get: () => mode.value,
  set: (value: 'offline' | 'online') => setMode(value),
})
const onlineTarget = 'http://8.130.215.175:8080'
const name = ref('newuser')
const password = ref('password1')
const inviteCode = ref('K7M2Q9')
const loading = ref(false)
const probeText = ref('尚未探测')
const onlineText = ref('未测')

const registerDto = computed(() => ({
  name: name.value,
  password: password.value,
  inviteCode: inviteCode.value,
}))
const loginDto = computed(() => ({
  name: name.value,
  password: password.value,
}))
const registerJson = computed(() => JSON.stringify(registerDto.value, null, 2))
const loginJson = computed(() => JSON.stringify(loginDto.value, null, 2))
const registerMissing = computed(() => missingRegisterKeys(registerDto.value).join(', ') || '无')
const registerExtra = computed(() => extraRegisterKeys(registerDto.value).join(', ') || '无')
const loginMissing = computed(() => missingLoginKeys(loginDto.value).join(', ') || '无')
const loginExtra = computed(() => extraLoginKeys(loginDto.value).join(', ') || '无')
const sessionText = computed(() => {
  if (!auth.user) {
    return '未登录'
  }
  return `${auth.user.name}（id ${auth.user.userId}${auth.user.isAdmin ? '，管理员' : '，非管理员'}）`
})
const successText = computed(() => describeResult(fixtureSuccessLogin()))
const failText = computed(() => describeResult(fixtureFail()))
const offlinePass = computed(
  () =>
    registerMissing.value === '无' &&
    registerExtra.value === '无' &&
    loginMissing.value === '无' &&
    loginExtra.value === '无' &&
    isResultShape(fixtureSuccessLogin()) &&
    Boolean(readLoginVO(fixtureSuccessLogin().data)) &&
    isResultShape(fixtureFail()),
)

async function probeRegister() {
  loading.value = true
  probeText.value = '请求中…'
  try {
    const { data } = await register(registerDto.value)
    rememberIfLoginVO(data)
    probeText.value = describeResult(data)
    if (mode.value === 'online') {
      onlineText.value = isResultShape(data) ? '通过' : '失败'
    }
  } catch (error) {
    probeText.value = describeProbeError(error)
    if (mode.value === 'online') {
      onlineText.value = onlineCatchLabel(error)
    }
  } finally {
    loading.value = false
  }
}

async function probeLogin() {
  loading.value = true
  probeText.value = '请求中…'
  try {
    const { data } = await login(loginDto.value)
    rememberIfLoginVO(data)
    probeText.value = describeResult(data)
    if (mode.value === 'online') {
      onlineText.value = isResultShape(data) ? '通过' : '失败'
    }
  } catch (error) {
    probeText.value = describeProbeError(error)
    if (mode.value === 'online') {
      onlineText.value = onlineCatchLabel(error)
    }
  } finally {
    loading.value = false
  }
}

async function probeInvite() {
  if (!auth.user) {
    probeText.value = '请先探测 login/register 成功（成功会写入会话），或先到登录页登录。发码需要请求头 token。'
    return
  }
  loading.value = true
  probeText.value = '请求中…'
  try {
    const { data } = await creatInviteCode()
    if (isResultShape(data) && data.code === ErrorCode.NOT_ADMIN) {
      probeText.value = `非管理员发码失败用例通过。${describeResult(data, 'none')}。成功路径：用户名改成 admin，先探测 login 再发码。`
    } else {
      probeText.value = describeResult(data, 'none')
    }
    if (mode.value === 'online') {
      onlineText.value = isResultShape(data) ? '通过' : '失败'
    }
  } catch (error) {
    probeText.value = describeProbeError(error)
    if (mode.value === 'online') {
      onlineText.value = onlineCatchLabel(error)
    }
  } finally {
    loading.value = false
  }
}

async function probeFiles() {
  if (!auth.user) {
    probeText.value = '请先探测 login/register 成功（成功会写入会话），或先到登录页登录。getFiles 需要请求头 token。'
    return
  }
  loading.value = true
  probeText.value = '请求中…'
  try {
    const { data } = await getFiles()
    const trees = isResultShape(data) && data.code === ErrorCode.OK ? readFilesVOList(data.data) : null
    if (trees) {
      const names = trees.map((node) => node.fileName).join('、')
      probeText.value = `getFiles 通过：${trees.length} 棵树（${names}）`
    } else {
      probeText.value = describeResult(data, 'none')
    }
    if (mode.value === 'online') {
      onlineText.value = trees ? '通过' : '失败'
    }
  } catch (error) {
    probeText.value = describeProbeError(error)
    if (mode.value === 'online') {
      onlineText.value = onlineCatchLabel(error)
    }
  } finally {
    loading.value = false
  }
}

function rememberIfLoginVO(data: unknown) {
  if (!isResultShape(data) || data.code !== 1) {
    return
  }
  const vo = readLoginVO(data.data)
  if (vo) {
    auth.setSession(vo)
  }
}

function describeProbeError(error: unknown): string {
  if (isAxiosError(error)) {
    return describeTransportError({
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    })
  }
  return '请求失败'
}

function onlineCatchLabel(error: unknown): string {
  if (isAxiosError(error) && error.response?.status && error.response.status >= 500) {
    return `已连通但 HTTP ${error.response.status}`
  }
  if (isAxiosError(error) && error.response) {
    return `HTTP ${error.response.status}`
  }
  return '未连通'
}
</script>
