import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { readApiMode } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type {
  FileSystemFileHandleLike,
  PersistedTransferRecord,
  TransferSaveStrategy,
  TransferStatus,
  TransferTask,
} from '@/types/transfer'
import {
  deleteTransferRecord,
  loadTransferRecords,
  saveTransferRecord,
} from '@/utils/transferDb'
import {
  UPLOAD_CHUNK_SIZE,
  allocateUploadKey,
  downloadContinuableWithProgress,
  finishUpload,
  probeUploadedSize,
  pushUploadChunk,
} from '@/api/transfers'
import { closeUpload } from '@/api/files'
import { isResultShape } from '@/dev/contract'
import { ErrorCode } from '@/types/errorCode'
import { isAxiosError } from 'axios'

const DEFAULT_CHUNK_SIZE = UPLOAD_CHUNK_SIZE
const MOCK_TICK_MS = 120

const sourceFiles = new Map<string, File>()
const sourceHandles = new Map<string, FileSystemFileHandleLike>()
const destinationHandles = new Map<string, FileSystemFileHandleLike>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const controllers = new Map<string, AbortController>()
const persistenceQueues = new Map<string, Promise<void>>()

function transferId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isTerminal(status: TransferStatus): boolean {
  return status === 'completed' || status === 'canceled'
}

export function restoredTransferStatus(
  task: TransferTask,
  hasSourceHandle: boolean,
  hasDestinationHandle: boolean,
  _online = false,
): TransferStatus {
  if (isTerminal(task.status) || task.status === 'failed') {
    return task.status
  }
  if (task.status === 'paused') {
    return 'paused'
  }
  if (task.direction === 'upload' && !hasSourceHandle) {
    return 'needs_source'
  }
  if (
    task.direction === 'download' &&
    task.saveStrategy === 'file-system-access' &&
    !hasDestinationHandle
  ) {
    return 'needs_destination'
  }
  // 刷新后不自动开跑，等用户点继续。
  return 'paused'
}

export function transferProgress(task: Pick<TransferTask, 'totalBytes' | 'transferredBytes'>) {
  if (task.totalBytes <= 0) {
    return 100
  }
  return Math.min(100, Math.round((task.transferredBytes / task.totalBytes) * 100))
}

export const useTransferStore = defineStore('transfers', () => {
  const tasks = ref<TransferTask[]>([])
  const hydrated = ref(false)
  const ownerId = ref(0)

  const activeCount = computed(
    () =>
      tasks.value.filter(
        (task) => !['completed', 'canceled', 'failed'].includes(task.status),
      ).length,
  )

  function owner(): number {
    return useAuthStore().user?.userId ?? 0
  }

  function taskById(id: string): TransferTask | undefined {
    return tasks.value.find((task) => task.id === id)
  }

  function patchTask(id: string, patch: Partial<TransferTask>): TransferTask | undefined {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index < 0) {
      return undefined
    }
    const task = {
      ...tasks.value[index],
      ...patch,
      updatedAt: Date.now(),
    }
    tasks.value[index] = task
    void persist(task)
    return task
  }

  function persist(task: TransferTask): Promise<void> {
    const record: PersistedTransferRecord = {
      id: task.id,
      ownerId: ownerId.value,
      task,
      sourceHandle: sourceHandles.get(task.id),
      destinationHandle: destinationHandles.get(task.id),
    }
    const previous = persistenceQueues.get(task.id) ?? Promise.resolve()
    const queued = previous
      .catch(() => undefined)
      .then(() => saveTransferRecord(record))
      .catch(() => undefined)
    persistenceQueues.set(task.id, queued)
    void queued.finally(() => {
      if (persistenceQueues.get(task.id) === queued) {
        persistenceQueues.delete(task.id)
      }
    })
    return queued
  }

  async function hydrate(): Promise<void> {
    const nextOwnerId = owner()
    if (hydrated.value && ownerId.value === nextOwnerId) {
      return
    }
    if (hydrated.value) {
      for (const task of tasks.value) {
        stopRuntime(task.id)
        sourceFiles.delete(task.id)
        sourceHandles.delete(task.id)
        destinationHandles.delete(task.id)
      }
      tasks.value = []
    }
    ownerId.value = nextOwnerId
    let records: PersistedTransferRecord[] = []
    try {
      records = await loadTransferRecords(ownerId.value)
    } catch {
      records = []
    }
    const online = readApiMode() === 'online'
    for (const record of records) {
      if (record.sourceHandle) {
        sourceHandles.set(record.task.id, record.sourceHandle)
      }
      if (record.destinationHandle) {
        destinationHandles.set(record.task.id, record.destinationHandle)
      }
      const task = {
        ...record.task,
        status: restoredTransferStatus(
          record.task,
          Boolean(record.sourceHandle),
          Boolean(record.destinationHandle),
          online,
        ),
        speedBps: 0,
        remainingSeconds: null,
      }
      tasks.value.push(task)
      void persist(task)
    }
    hydrated.value = true
  }

  function stopRuntime(id: string) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    controllers.get(id)?.abort()
    controllers.delete(id)
  }

  function mockTick(id: string, previousAt: number, previousBytes: number) {
    const task = taskById(id)
    if (!task || task.status !== 'running') {
      return
    }
    const remaining = Math.max(0, task.totalBytes - task.transferredBytes)
    const advance = Math.min(
      remaining,
      Math.max(task.chunkSize, Math.ceil(task.totalBytes / 20), task.totalBytes === 0 ? 0 : 1),
    )
    const now = Date.now()
    const transferredBytes = task.transferredBytes + advance
    const elapsedSeconds = Math.max((now - previousAt) / 1000, 0.001)
    const speedBps = Math.round((transferredBytes - previousBytes) / elapsedSeconds)
    const bytesLeft = Math.max(0, task.totalBytes - transferredBytes)

    if (transferredBytes >= task.totalBytes) {
      timers.delete(id)
      patchTask(id, {
        status: 'completed',
        transferredBytes: task.totalBytes,
        nextOffset: task.totalBytes,
        speedBps: 0,
        remainingSeconds: 0,
      })
      sourceFiles.delete(id)
      return
    }

    patchTask(id, {
      transferredBytes,
      nextOffset: transferredBytes,
      speedBps,
      remainingSeconds: speedBps > 0 ? Math.ceil(bytesLeft / speedBps) : null,
    })
    timers.set(
      id,
      setTimeout(() => mockTick(id, now, transferredBytes), MOCK_TICK_MS),
    )
  }

  function startOffline(id: string) {
    const task = taskById(id)
    if (!task || isTerminal(task.status)) {
      return
    }
    if (task.direction === 'upload' && !sourceFiles.has(id)) {
      patchTask(id, { status: 'needs_source', speedBps: 0, remainingSeconds: null })
      return
    }
    stopRuntime(id)
    controllers.set(id, new AbortController())
    const started = patchTask(id, {
      status: 'running',
      errorCode: undefined,
      errorMessage: undefined,
    })
    if (!started) {
      return
    }
    if (started.totalBytes === 0) {
      patchTask(id, { status: 'completed', remainingSeconds: 0 })
      return
    }
    const now = Date.now()
    timers.set(
      id,
      setTimeout(() => mockTick(id, now, started.transferredBytes), MOCK_TICK_MS),
    )
  }

  function begin(id: string) {
    if (readApiMode() === 'online') {
      void startOnline(id)
      return
    }
    startOffline(id)
  }

  function failTask(id: string, code?: number, message?: string) {
    patchTask(id, {
      status: 'failed',
      speedBps: 0,
      remainingSeconds: null,
      errorCode: code,
      errorMessage: message || (code != null ? String(code) : 'TRANSFER_FAILED'),
    })
  }

  async function startOnline(id: string) {
    const task = taskById(id)
    if (!task || isTerminal(task.status)) {
      return
    }
    if (task.direction === 'upload') {
      await runOnlineUpload(id)
      return
    }
    await runOnlineDownload(id)
  }

  async function runOnlineUpload(id: string) {
    const file = sourceFiles.get(id)
    if (!file) {
      patchTask(id, { status: 'needs_source', speedBps: 0, remainingSeconds: null })
      return
    }
    stopRuntime(id)
    const controller = new AbortController()
    controllers.set(id, controller)
    let task = patchTask(id, {
      status: 'running',
      errorCode: undefined,
      errorMessage: undefined,
      chunkSize: DEFAULT_CHUNK_SIZE,
    })
    if (!task) {
      return
    }

    try {
      let uploadKey = task.serverTransferId
      let offset = task.nextOffset
      let nextType: 0 | 1 = 0

      if (!uploadKey) {
        const allocated = await allocateUploadKey()
        if (!allocated.ok) {
          const code = isResultShape(allocated.result) ? allocated.result.code : ErrorCode.EXCEPTION
          failTask(id, code)
          return
        }
        uploadKey = allocated.uploadKey
        offset = 0
        nextType = 0
        task = patchTask(id, { serverTransferId: uploadKey, nextOffset: 0, transferredBytes: 0 }) ?? task
      } else {
        const probed = await probeUploadedSize(uploadKey)
        if (probed.ok) {
          offset = probed.nextOffset
          nextType = offset > 0 ? 1 : 0
          patchTask(id, { nextOffset: offset, transferredBytes: offset })
        } else {
          nextType = 0
          offset = 0
        }
      }

      if (file.size === 0) {
        const empty = await pushUploadChunk({
          uploadKey,
          targetPath: task.targetPath,
          file,
          offset: 0,
          uploadType: 0,
        })
        if (!empty.ok) {
          const code = isResultShape(empty.result) ? empty.result.code : ErrorCode.FILE_OPERATION_FAILED
          failTask(id, code)
          return
        }
        await finishUpload(uploadKey)
        patchTask(id, {
          status: 'completed',
          transferredBytes: 0,
          nextOffset: 0,
          speedBps: 0,
          remainingSeconds: 0,
        })
        return
      }

      while (offset < file.size) {
        if (controller.signal.aborted) {
          return
        }
        const startedAt = Date.now()
        const previous = offset
        const pushed = await pushUploadChunk({
          uploadKey,
          targetPath: task.targetPath,
          file,
          offset,
          uploadType: nextType,
          chunkSize: task.chunkSize,
        })
        if (!pushed.ok) {
          const code = isResultShape(pushed.result) ? pushed.result.code : ErrorCode.FILE_OPERATION_FAILED
          failTask(id, code)
          return
        }
        offset = pushed.nextOffset
        nextType = 1
        const elapsed = Math.max((Date.now() - startedAt) / 1000, 0.001)
        const speedBps = Math.round((offset - previous) / elapsed)
        const left = Math.max(0, file.size - offset)
        patchTask(id, {
          transferredBytes: offset,
          nextOffset: offset,
          speedBps,
          remainingSeconds: speedBps > 0 ? Math.ceil(left / speedBps) : null,
        })
      }

      if (controller.signal.aborted) {
        return
      }
      await finishUpload(uploadKey)
      patchTask(id, {
        status: 'completed',
        transferredBytes: file.size,
        nextOffset: file.size,
        speedBps: 0,
        remainingSeconds: 0,
      })
      sourceFiles.delete(id)
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      const code =
        isAxiosError(error) && error.response && isResultShape(error.response.data)
          ? error.response.data.code
          : ErrorCode.EXCEPTION
      failTask(id, code, isAxiosError(error) ? error.message : undefined)
    } finally {
      controllers.delete(id)
    }
  }

  async function runOnlineDownload(id: string) {
    const task = taskById(id)
    if (!task) {
      return
    }
    if (task.saveStrategy === 'file-system-access' && !destinationHandles.get(id)) {
      patchTask(id, { status: 'needs_destination', speedBps: 0, remainingSeconds: null })
      return
    }
    stopRuntime(id)
    const controller = new AbortController()
    controllers.set(id, controller)
    patchTask(id, {
      status: 'running',
      errorCode: undefined,
      errorMessage: undefined,
      transferredBytes: 0,
      nextOffset: 0,
    })

    try {
      const startedAt = Date.now()
      let lastLoaded = 0
      const response = await downloadContinuableWithProgress({
        path: task.sourcePath,
        downloadedSize: 0,
        signal: controller.signal,
        onProgress: (event) => {
          const loaded = event.loaded
          const now = Date.now()
          const elapsed = Math.max((now - startedAt) / 1000, 0.001)
          const speedBps = Math.round(loaded / elapsed)
          const total = task.totalBytes > 0 ? task.totalBytes : event.total || loaded
          const left = Math.max(0, total - loaded)
          lastLoaded = loaded
          patchTask(id, {
            transferredBytes: loaded,
            nextOffset: loaded,
            totalBytes: task.totalBytes > 0 ? task.totalBytes : total,
            speedBps,
            remainingSeconds: speedBps > 0 ? Math.ceil(left / speedBps) : null,
          })
        },
      })

      if (controller.signal.aborted) {
        return
      }

      const data = response.data
      if (!(data instanceof Blob)) {
        failTask(id, ErrorCode.FILE_OPERATION_FAILED)
        return
      }
      const type = String(response.headers?.['content-type'] ?? '')
      if (type.includes('json')) {
        try {
          const parsed: unknown = JSON.parse(await data.text())
          if (isResultShape(parsed)) {
            failTask(id, parsed.code)
            return
          }
        } catch {
          /* fall through */
        }
        failTask(id, ErrorCode.FILE_OPERATION_FAILED)
        return
      }

      const handle = destinationHandles.get(id)
      if (handle?.createWritable) {
        const writable = await handle.createWritable()
        await writable.write(data)
        await writable.close()
      } else {
        const url = URL.createObjectURL(data)
        const link = document.createElement('a')
        link.href = url
        link.download = task.fileName
        link.click()
        URL.revokeObjectURL(url)
      }

      patchTask(id, {
        status: 'completed',
        transferredBytes: Math.max(lastLoaded, data.size, task.totalBytes),
        nextOffset: Math.max(lastLoaded, data.size, task.totalBytes),
        speedBps: 0,
        remainingSeconds: 0,
      })
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }
      const code =
        isAxiosError(error) && error.response && isResultShape(error.response.data)
          ? error.response.data.code
          : ErrorCode.EXCEPTION
      failTask(id, code, isAxiosError(error) ? error.message : undefined)
    } finally {
      controllers.delete(id)
    }
  }

  async function enqueueUpload(
    file: File,
    targetPath: string,
    sourceHandle?: FileSystemFileHandleLike,
  ): Promise<TransferTask> {
    await hydrate()
    const now = Date.now()
    const task: TransferTask = {
      id: transferId(),
      direction: 'upload',
      status: 'queued',
      fileName: file.name,
      totalBytes: file.size,
      transferredBytes: 0,
      nextOffset: 0,
      chunkSize: DEFAULT_CHUNK_SIZE,
      sourcePath: file.name,
      targetPath,
      saveLocation: targetPath,
      saveStrategy: 'browser-download',
      speedBps: 0,
      remainingSeconds: null,
      createdAt: now,
      updatedAt: now,
    }
    sourceFiles.set(task.id, file)
    if (sourceHandle) {
      sourceHandles.set(task.id, sourceHandle)
    }
    tasks.value.unshift(task)
    await persist(task)
    begin(task.id)
    return task
  }

  async function enqueueDownload(input: {
    fileName: string
    sourcePath: string
    totalBytes: number
    saveLocation: string
    saveStrategy: TransferSaveStrategy
    destinationHandle?: FileSystemFileHandleLike
  }): Promise<TransferTask> {
    await hydrate()
    const now = Date.now()
    const task: TransferTask = {
      id: transferId(),
      direction: 'download',
      status: 'queued',
      fileName: input.fileName,
      totalBytes: Math.max(0, input.totalBytes),
      transferredBytes: 0,
      nextOffset: 0,
      chunkSize: DEFAULT_CHUNK_SIZE,
      sourcePath: input.sourcePath,
      targetPath: input.saveLocation,
      saveLocation: input.saveLocation,
      saveStrategy: input.saveStrategy,
      speedBps: 0,
      remainingSeconds: null,
      createdAt: now,
      updatedAt: now,
    }
    if (input.destinationHandle) {
      destinationHandles.set(task.id, input.destinationHandle)
    }
    tasks.value.unshift(task)
    await persist(task)
    begin(task.id)
    return task
  }

  function pause(id: string) {
    const task = taskById(id)
    if (!task || !['queued', 'running', 'waiting_backend'].includes(task.status)) {
      return
    }
    stopRuntime(id)
    patchTask(id, { status: 'paused', speedBps: 0, remainingSeconds: null })
  }

  async function resume(id: string) {
    const task = taskById(id)
    if (!task || isTerminal(task.status)) {
      return
    }
    if (task.direction === 'upload' && !sourceFiles.has(id)) {
      const handle = sourceHandles.get(id)
      if (!handle) {
        patchTask(id, { status: 'needs_source' })
        return
      }
      try {
        const permission = await handle.requestPermission?.({ mode: 'read' })
        if (permission && permission !== 'granted') {
          patchTask(id, { status: 'needs_source' })
          return
        }
        sourceFiles.set(id, await handle.getFile())
      } catch {
        patchTask(id, { status: 'needs_source' })
        return
      }
    }
    begin(id)
  }

  function cancel(id: string) {
    const task = taskById(id)
    if (!task || isTerminal(task.status)) {
      return
    }
    stopRuntime(id)
    const uploadKey = task.serverTransferId
    if (task.direction === 'upload' && uploadKey && readApiMode() === 'online') {
      void closeUpload({ uploadKey }).catch(() => undefined)
    }
    patchTask(id, {
      status: 'canceled',
      speedBps: 0,
      remainingSeconds: null,
      errorMessage: undefined,
    })
    sourceFiles.delete(id)
  }

  function retry(id: string) {
    const task = taskById(id)
    if (!task || !['failed', 'canceled', 'needs_source', 'needs_destination'].includes(task.status)) {
      return
    }
    patchTask(id, {
      status: 'paused',
      errorCode: undefined,
      errorMessage: undefined,
    })
    void resume(id)
  }

  async function attachSource(id: string, file: File, handle?: FileSystemFileHandleLike) {
    const task = taskById(id)
    if (!task || task.direction !== 'upload') {
      return false
    }
    if (file.name !== task.fileName || file.size !== task.totalBytes) {
      patchTask(id, { errorMessage: 'SOURCE_FILE_MISMATCH', status: 'needs_source' })
      return false
    }
    sourceFiles.set(id, file)
    if (handle) {
      sourceHandles.set(id, handle)
    }
    patchTask(id, { sourcePath: file.name, status: 'paused', errorMessage: undefined })
    await resume(id)
    return true
  }

  async function attachDestination(
    id: string,
    handle: FileSystemFileHandleLike,
    saveLocation = handle.name,
  ) {
    const task = taskById(id)
    if (!task || task.direction !== 'download') {
      return false
    }
    destinationHandles.set(id, handle)
    patchTask(id, {
      saveLocation,
      targetPath: saveLocation,
      saveStrategy: 'file-system-access',
      status: 'paused',
    })
    await resume(id)
    return true
  }

  function useBrowserDestination(id: string, saveLocation: string) {
    const task = taskById(id)
    if (!task || task.direction !== 'download') {
      return
    }
    destinationHandles.delete(id)
    patchTask(id, {
      saveLocation,
      targetPath: saveLocation,
      saveStrategy: 'browser-download',
      status: 'paused',
    })
    void resume(id)
  }

  async function remove(id: string) {
    const task = taskById(id)
    if (!task || !isTerminal(task.status)) {
      return
    }
    stopRuntime(id)
    tasks.value = tasks.value.filter((item) => item.id !== id)
    sourceFiles.delete(id)
    sourceHandles.delete(id)
    destinationHandles.delete(id)
    try {
      await persistenceQueues.get(id)
      await deleteTransferRecord(id)
    } catch {
      /* ignore storage failures */
    }
  }

  async function clearCompleted() {
    const ids = tasks.value
      .filter((task) => task.status === 'completed' || task.status === 'canceled')
      .map((task) => task.id)
    await Promise.all(ids.map((id) => remove(id)))
  }

  return {
    tasks,
    hydrated,
    activeCount,
    hydrate,
    enqueueUpload,
    enqueueDownload,
    pause,
    resume,
    cancel,
    retry,
    attachSource,
    attachDestination,
    useBrowserDestination,
    remove,
    clearCompleted,
  }
})
