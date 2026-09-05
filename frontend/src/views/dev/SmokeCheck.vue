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
      ｜
      <router-link to="/drive">网盘</router-link>
      ｜
      <router-link to="/drive/settings">设置</router-link>
    </p>
    <p>
      <button type="button" :disabled="loading" @click="runSmoke">跑本模式冒烟</button>
    </p>
    <p v-for="(line, index) in smokeLines" :key="index">{{ line }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { login, logout, register } from '@/api/auth'
import { creatInviteCode } from '@/api/invitations'
import { downloadFile, getFiles, uploadFile } from '@/api/files'
import { useApiMode } from '@/composables/useApiMode'
import { isResultOk, isResultShape, readLoginVO, describeTransportError } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode } from '@/types/errorCode'
import { readFilesVOList, toServerPath, type FilesVO } from '@/types/file'
import { canDownloadInFolder, canWriteInFolder } from '@/utils/driveAccess'

const router = useRouter()
const auth = useAuthStore()
const { mode, setMode } = useApiMode()
const modeModel = computed({
  get: () => mode.value,
  set: (value: 'offline' | 'online') => setMode(value),
})
const loading = ref(false)
const smokeLines = ref<string[]>(['尚未跑'])

const checks = computed(() => [
  { ok: true, name: '应用已挂载', detail: '' },
  {
    ok:
      router.hasRoute('register') &&
      router.hasRoute('login') &&
      router.hasRoute('drive') &&
      router.hasRoute('drive-settings') &&
      router.hasRoute('admin-invitations'),
    name: '路由 /register /login /drive /drive/settings /admin/invitations',
    detail: '',
  },
  {
    ok: (import.meta.env.VITE_API_BASE_URL || '/api') === '/api',
    name: 'API 基址 /api',
    detail: `（当前 ${import.meta.env.VITE_API_BASE_URL || '/api'}）`,
  },
])

function treeHasFile(nodes: FilesVO[] | null | undefined, name: string): boolean {
  if (!nodes) {
    return false
  }
  for (const node of nodes) {
    if (node.isFile && node.fileName === name) {
      return true
    }
    if (treeHasFile(node.filesVOS, name)) {
      return true
    }
  }
  return false
}

async function runSmoke() {
  loading.value = true
  smokeLines.value = ['请求中…']
  const lines: string[] = []
  try {
    const payload =
      mode.value === 'offline'
        ? { name: 'smokeuser', password: 'password1', inviteCode: 'K7M2Q9' }
        : { name: '__smoke__', password: '__smoke__', inviteCode: '__smoke__' }
    const { data: registerBody } = await register(payload)
    const { data: loginBody } = await login({ name: payload.name, password: payload.password })
    const registerOk = isResultShape(registerBody) && registerBody.code === 1
    const loginOk = isResultShape(loginBody) && loginBody.code === 1
    const registerVo = registerOk ? readLoginVO(registerBody.data) : null
    const loginVo = loginOk ? readLoginVO(loginBody.data) : null
    if (loginVo) {
      auth.setSession(loginVo)
    }
    lines.push(
      registerVo && loginVo ? '通过 — 登录注册 LoginVO' : '失败 — 登录注册 LoginVO',
    )

    const filesBody = loginVo ? (await getFiles()).data : null
    const trees = filesBody && isResultOk(filesBody) ? readFilesVOList(filesBody.data) : null
    const hasPublic = Boolean(trees?.some((node) => node.fileName === 'public'))
    const hasRoom = Boolean(loginVo && trees?.some((node) => node.fileName === String(loginVo.userId)))
    lines.push(hasPublic && hasRoom ? '通过 — getFiles 有公共目录和自己的房间' : '失败 — getFiles 列表')

    const userId = loginVo?.userId ?? null
    const publicWrite = canWriteInFolder({ crumbs: ['public'], userId, isAdmin: false })
    const publicDown = canDownloadInFolder({ crumbs: ['public'], userId, isAdmin: false })
    const roomWrite = canWriteInFolder({ crumbs: [String(userId)], userId, isAdmin: false })
    lines.push(
      !publicWrite && publicDown && roomWrite
        ? '通过 — 普通用户公共只下载、房间可写'
        : '失败 — 权限规则',
    )

    if (loginVo) {
      const { data: inviteBody } = await creatInviteCode()
      const notAdmin = isResultShape(inviteBody) && inviteBody.code === ErrorCode.NOT_ADMIN
      lines.push(notAdmin ? '通过 — 非管理员发码 10002' : '失败 — 非管理员发码')
    }

    if (mode.value === 'offline' && loginVo) {
      const fileName = `smoke-${Date.now()}.txt`
      const file = new File(['smoke-ok'], fileName, { type: 'text/plain' })
      const { data: uploadBody } = await uploadFile(toServerPath([String(loginVo.userId)]), file)
      const uploadOk = isResultOk(uploadBody)
      const after = uploadOk ? (await getFiles()).data : null
      const afterTrees = after && isResultOk(after) ? readFilesVOList(after.data) : null
      const room = afterTrees?.find((node) => node.fileName === String(loginVo.userId))
      const listed = treeHasFile(room ? [room] : null, fileName)
      lines.push(uploadOk && listed ? '通过 — 上传后列表出现文件' : '失败 — 上传')

      const { data: blob, headers } = await downloadFile({
        downloadFilePath: toServerPath([String(loginVo.userId), fileName]),
        downloadType: 0,
        downloadedSize: 0,
      })
      const downOk =
        blob instanceof Blob && !String(headers['content-type'] ?? '').includes('json') && blob.size > 0
      lines.push(downOk ? '通过 — 下载返回文件流' : '失败 — 下载')

      const { data: logoutBody } = await logout()
      const logoutOk = isResultOk(logoutBody)
      lines.push(logoutOk ? '通过 — 退出 logout' : '失败 — 退出')
    }

    if (mode.value === 'online') {
      lines.push(
        registerOk && loginOk
          ? `在线：register code=${registerBody.code} login code=${loginBody.code}${trees ? ` getFiles ${trees.length} 棵树` : ''}`
          : '在线通了但返回不是 Result',
      )
    }

    smokeLines.value = lines
  } catch (error) {
    if (isAxiosError(error)) {
      smokeLines.value = [
        describeTransportError({
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        }),
      ]
      return
    }
    smokeLines.value = [mode.value === 'online' ? '在线请求失败' : '离线 mock 未响应，请确认 npm run dev']
  } finally {
    loading.value = false
  }
}
</script>
