<template>
  <main>
    <h1>契约验证</h1>
    <p>对照 Api.md：POST /api/user/register，DTO 驼峰三字段，返回 boolean。</p>
    <p>当前只做前端本地验证，不要打开 localhost:8080。</p>
    <p><strong>本地契约：{{ localPass ? '通过' : '失败' }}</strong></p>

    <h2>1. 请求体形状</h2>
    <pre>{{ payloadJson }}</pre>
    <p>缺字段：{{ missingText }}</p>
    <p>多余字段：{{ extraText }}</p>

    <h2>2. 返回值夹具（不连后端）</h2>
    <p>true → {{ trueText }}</p>
    <p>false → {{ falseText }}</p>

    <h2>3. 打 /api（可选，现在走本地 mock）</h2>
    <p>联调真 Spring 之前可以不点。邀请码填 fail 会得到 false。</p>
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
      <button type="button" :disabled="loading" @click="probe">探测 /api</button>
    </p>
    <p>{{ result }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { register } from '@/api/auth'
import {
  describeRegisterResponse,
  extraPayloadKeys,
  isRegisterResult,
  missingPayloadKeys,
} from '@/dev/registerContract'

const name = ref('alice')
const password = ref('password')
const inviteCode = ref('K7M2Q9')
const loading = ref(false)
const result = ref('尚未探测（本地契约不依赖这一步）')

const payload = computed(() => ({
  name: name.value,
  password: password.value,
  inviteCode: inviteCode.value,
}))
const payloadJson = computed(() => JSON.stringify(payload.value, null, 2))
const missingKeys = computed(() => missingPayloadKeys(payload.value))
const extraKeys = computed(() => extraPayloadKeys(payload.value))
const missingText = computed(() => (missingKeys.value.length ? missingKeys.value.join(', ') : '无'))
const extraText = computed(() => (extraKeys.value.length ? extraKeys.value.join(', ') : '无'))
const trueText = computed(() => describeRegisterResponse(true))
const falseText = computed(() => describeRegisterResponse(false))
const localPass = computed(
  () =>
    missingKeys.value.length === 0 &&
    extraKeys.value.length === 0 &&
    isRegisterResult(true) &&
    isRegisterResult(false),
)

async function probe() {
  loading.value = true
  result.value = '请求中…'
  try {
    const { data } = await register(payload.value)
    result.value = describeRegisterResponse(data)
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      result.value = `HTTP ${error.response.status}；${describeRegisterResponse(error.response.data)}`
    } else {
      result.value = '无法连接 /api（本地 mock 未生效，或未开开发服务器）'
    }
  } finally {
    loading.value = false
  }
}
</script>
