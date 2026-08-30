import { computed, ref } from 'vue'
import { isAxiosError } from 'axios'
import { addFile, deleteFile, downloadFile, getFiles, renameFile, uploadFile } from '@/api/files'
import { isResultShape } from '@/dev/contract'
import { useAuthStore } from '@/stores/auth'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import {
  childrenOf,
  isLegalFileName,
  readFilesVOList,
  toServerPath,
  type FilesVO,
} from '@/types/file'
import { canDownloadInFolder, canWriteInFolder } from '@/utils/driveAccess'

function sortEntries(items: FilesVO[]): FilesVO[] {
  return [...items].sort((a, b) => {
    if (a.isFile !== b.isFile) {
      return a.isFile ? 1 : -1
    }
    return a.fileName.localeCompare(b.fileName, 'zh')
  })
}

function readDraftName(raw: string): string | null {
  const name = raw.trim()
  if (!name) {
    return null
  }
  return isLegalFileName(name) ? name : ''
}

async function resultFromBlob(data: Blob): Promise<{ code: number } | null> {
  const text = await data.text()
  try {
    const parsed: unknown = JSON.parse(text)
    return isResultShape(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function useDriveFiles() {
  const auth = useAuthStore()
  const roots = ref<FilesVO[]>([])
  const crumbs = ref<string[]>([])
  const loading = ref(false)
  const message = ref('')
  const nameDraft = ref('')

  const currentItems = computed(() => {
    if (crumbs.value.length === 0) {
      return sortEntries(roots.value)
    }
    let nodes = roots.value
    let current: FilesVO | undefined
    for (const name of crumbs.value) {
      current = nodes.find((node) => node.fileName === name)
      if (!current) {
        return []
      }
      nodes = childrenOf(current)
    }
    return sortEntries(nodes)
  })

  const access = computed(() => ({
    crumbs: crumbs.value,
    userId: auth.user?.userId,
    isAdmin: auth.isAdmin,
  }))

  const canWrite = computed(() => canWriteInFolder(access.value))
  const canDownload = computed(() => canDownloadInFolder(access.value))

  const atRoot = computed(() => crumbs.value.length === 0)

  const showActions = computed(() => canWrite.value || canDownload.value)

  function labelOf(name: string): string {
    if (name === 'public') {
      return '公共'
    }
    if (auth.user && name === String(auth.user.userId)) {
      return `我的房间（${name}）`
    }
    return name
  }

  function trimCrumbs() {
    let nodes = roots.value
    const kept: string[] = []
    for (const name of crumbs.value) {
      const found = nodes.find((node) => node.fileName === name && !node.isFile)
      if (!found) {
        break
      }
      kept.push(name)
      nodes = childrenOf(found)
    }
    crumbs.value = kept
  }

  async function load() {
    loading.value = true
    message.value = ''
    try {
      const { data } = await getFiles()
      if (!isResultShape(data)) {
        message.value = '返回不是 Result'
        return
      }
      if (data.code !== ErrorCode.OK) {
        message.value = messageForCode(data.code)
        return
      }
      const list = readFilesVOList(data.data)
      if (!list) {
        message.value = '文件列表形状不对'
        return
      }
      roots.value = list
      trimCrumbs()
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

  function enter(node: FilesVO) {
    if (node.isFile) {
      return
    }
    crumbs.value = [...crumbs.value, node.fileName]
  }

  function goRoot() {
    crumbs.value = []
  }

  function goTo(index: number) {
    crumbs.value = crumbs.value.slice(0, index + 1)
  }

  function goUp() {
    crumbs.value = crumbs.value.slice(0, -1)
  }

  function itemPath(name: string): string {
    return toServerPath([...crumbs.value, name])
  }

  function currentDirPath(): string {
    return toServerPath(crumbs.value)
  }

  function requireName(action: string): string | undefined {
    const parsed = readDraftName(nameDraft.value)
    if (parsed === null) {
      message.value = `请先在名称框里填写${action}`
      return undefined
    }
    if (parsed === '') {
      message.value = messageForCode(ErrorCode.FILE_NAME_ILLEGAL)
      return undefined
    }
    return parsed
  }

  async function mutate(run: () => Promise<unknown>) {
    if (!canWrite.value) {
      message.value = messageForCode(ErrorCode.NO_PERMISSION)
      return
    }
    loading.value = true
    message.value = ''
    try {
      const data = await run()
      if (!isResultShape(data)) {
        message.value = '返回不是 Result'
        return
      }
      if (data.code !== ErrorCode.OK) {
        message.value = messageForCode(data.code)
        return
      }
      await load()
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

  async function createFolder() {
    if (atRoot.value || !canWrite.value) {
      return
    }
    const name = requireName('文件夹名称')
    if (!name) {
      return
    }
    await mutate(async () => {
      const { data } = await addFile({ isFile: false, path: itemPath(name) })
      return data
    })
    if (!message.value) {
      nameDraft.value = ''
    }
  }

  async function renameItem(node: FilesVO) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    const name = requireName('新名称')
    if (!name) {
      return
    }
    if (name === node.fileName) {
      return
    }
    await mutate(async () => {
      const { data } = await renameFile({ path: itemPath(node.fileName), newName: name })
      return data
    })
    if (!message.value) {
      nameDraft.value = ''
    }
  }

  async function removeItem(node: FilesVO) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    await mutate(async () => {
      const { data } = await deleteFile({ path: itemPath(node.fileName) })
      return data
    })
  }

  async function uploadPicked(file: File | undefined) {
    if (atRoot.value || !canWrite.value) {
      return
    }
    if (!file) {
      message.value = '请选择要上传的文件'
      return
    }
    if (!isLegalFileName(file.name)) {
      message.value = messageForCode(ErrorCode.FILE_NAME_ILLEGAL)
      return
    }
    await mutate(async () => {
      const { data } = await uploadFile(currentDirPath(), file)
      return data
    })
  }

  async function downloadItem(node: FilesVO) {
    if (!node.isFile) {
      return
    }
    if (!canDownload.value) {
      message.value = messageForCode(ErrorCode.NO_PERMISSION)
      return
    }
    loading.value = true
    message.value = ''
    try {
      const { data, headers } = await downloadFile({ path: itemPath(node.fileName) })
      if (!(data instanceof Blob)) {
        message.value = '下载失败'
        return
      }
      const type = String(headers['content-type'] ?? '')
      if (type.includes('json')) {
        const body = await resultFromBlob(data)
        message.value = body ? messageForCode(body.code) : '下载失败'
        return
      }
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = node.fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data instanceof Blob) {
        const body = await resultFromBlob(error.response.data)
        if (body) {
          message.value = messageForCode(body.code)
          return
        }
      }
      if (isAxiosError(error) && error.response && isResultShape(error.response.data)) {
        message.value = messageForCode(error.response.data.code)
        return
      }
      message.value = '无法连接服务器'
    } finally {
      loading.value = false
    }
  }

  return {
    roots,
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
  }
}
