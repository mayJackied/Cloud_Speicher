<template>
  <main>
    <h1>注册</h1>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="用户名" prop="name">
        <el-input v-model="form.name" autocomplete="username" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="邀请码" prop="inviteCode">
        <el-input v-model="form.inviteCode" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading">注册</el-button>
      </el-form-item>
    </el-form>
    <p><router-link to="/login">去登录</router-link></p>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { getUsersName, register } from '@/api/auth'
import { describeResult, isResultShape, readLoginVO } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import {
  NAME_PATTERN,
  NAME_RULE_TEXT,
  PASSWORD_PATTERN,
  PASSWORD_RULE_TEXT,
} from '@/types/constraints'
import { AuthMsg, ResultCode } from '@/types/authStatus'

const formRef = ref<FormInstance>()
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})

const rules: FormRules<typeof form> = {
  name: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { pattern: NAME_PATTERN, message: NAME_RULE_TEXT, trigger: 'blur' },
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { pattern: PASSWORD_PATTERN, message: PASSWORD_RULE_TEXT, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) {
          callback(new Error('确认密码必须一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  inviteCode: [{ required: true, message: '邀请码不能为空', trigger: 'blur' }],
}

async function onSubmit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    return
  }

  const dto = {
    name: form.name.trim(),
    password: form.password,
    inviteCode: form.inviteCode.trim(),
  }

  loading.value = true
  try {
    const namesRes = await getUsersName()
    if (isResultShape(namesRes.data) && namesRes.data.code === ResultCode.OK) {
      const names = namesRes.data.data ?? []
      if (names.includes(dto.name)) {
        ElMessage.error(AuthMsg.REGISTER_NAME_TAKEN)
        return
      }
    }

    const { data } = await register(dto)
    if (!isResultShape(data)) {
      ElMessage.error(describeResult(data))
      return
    }
    if (data.code === ResultCode.OK) {
      const vo = readLoginVO(data.data)
      if (!vo) {
        ElMessage.error(describeResult(data))
        return
      }
      auth.setSession(vo)
      ElMessage.success('注册成功')
      await router.push({ name: 'drive' })
      return
    }
    ElMessage.error(data.msg || AuthMsg.REGISTER_BAD_INVITE)
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      const body = error.response.data
      ElMessage.error(
        isResultShape(body) ? body.msg || AuthMsg.REGISTER_BAD_INVITE : `注册失败（HTTP ${error.response.status}）`,
      )
      return
    }
    ElMessage.error('无法连接服务器（离线 mock 未生效，或在线 FRP 不通）')
  } finally {
    loading.value = false
  }
}
</script>
