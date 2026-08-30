<template>
  <main>
    <h1>网盘</h1>
    <p>
      已登录：{{ auth.user?.name }}（id {{ auth.user?.userId }}）　权限：{{
        isAdmin ? '管理员' : '普通用户'
      }}
    </p>
    <p>
      <router-link to="/admin/invitations">发邀请码 /admin/invitations</router-link>
      ｜
      <router-link to="/drive/settings">设置</router-link>
      ｜
      <button type="button" @click="onLogout">退出</button>
    </p>
    <p>公共目录：普通用户只能下载；管理员可新建、上传、重命名、删除。</p>
    <p v-if="!isAdmin">
      若你是管理员但此处显示普通用户，点上面「发邀请码」生成一次；成功后会按后端权限刷新，公共空间会出现新建和上传。
    </p>

    <p>
      <button type="button" @click="goRoot">全部</button>
      <template v-for="(name, index) in crumbs" :key="`${index}-${name}`">
        /
        <button type="button" @click="goTo(index)">{{ labelOf(name) }}</button>
      </template>
    </p>
    <p>
      <button type="button" :disabled="loading || atRoot" @click="goUp">上一级</button>
      <button type="button" :disabled="loading" @click="load">刷新</button>
    </p>
    <p v-if="canWrite">
      <label>
        名称
        <input v-model="nameDraft" :disabled="loading" placeholder="新建或重命名用" />
      </label>
      <button type="button" :disabled="loading" @click="createFolder">新建文件夹</button>
    </p>
    <p v-if="canWrite">
      <label>
        上传
        <input type="file" :disabled="loading" @change="onPickFile" />
      </label>
    </p>
    <p v-if="message">{{ message }}</p>
    <p v-if="loading">加载中…</p>
    <p v-else-if="currentItems.length === 0">这个文件夹是空的</p>
    <table v-else>
      <thead>
        <tr>
          <th>名称</th>
          <th>类型</th>
          <th>大小</th>
          <th>修改时间</th>
          <th v-if="showActions">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in currentItems" :key="item.fileName">
          <td>
            <button v-if="!item.isFile" type="button" @click="enter(item)">{{ labelOf(item.fileName) }}</button>
            <span v-else>{{ item.fileName }}</span>
          </td>
          <td>{{ item.isFile ? '文件' : '文件夹' }}</td>
          <td>{{ item.isFile ? item.length : '—' }}</td>
          <td>{{ formatTime(item.lastModified) }}</td>
          <td v-if="showActions">
            <button
              v-if="item.isFile && canDownload"
              type="button"
              :disabled="loading"
              @click="downloadItem(item)"
            >
              下载
            </button>
            <button v-if="canWrite" type="button" :disabled="loading" @click="renameItem(item)">重命名</button>
            <button v-if="canWrite" type="button" :disabled="loading" @click="removeItem(item)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { useDriveFiles } from '@/composables/useDriveFiles'

const auth = useAuthStore()
const { isAdmin } = usePermission()
const router = useRouter()
const {
  crumbs,
  loading,
  message,
  nameDraft,
  currentItems,
  canWrite,
  canDownload,
  atRoot,
  showActions,
  labelOf,
  load,
  enter,
  goRoot,
  goTo,
  goUp,
  createFolder,
  renameItem,
  removeItem,
  uploadPicked,
  downloadItem,
} = useDriveFiles()

function formatTime(value: number): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString()
}

function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement
  void uploadPicked(input.files?.[0])
  input.value = ''
}

function onLogout() {
  auth.logout()
  void router.push({ name: 'login' })
}

onMounted(() => {
  void load()
})
</script>
