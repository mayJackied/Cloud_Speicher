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
  allocateFolderUploadKey,
  allocateUploadKey,
  downloadContinuableWithProgress,
  finishFolderFile,
  finishFolderUpload,
  finishUpload,
  probeFolderFile,
  probeUploadedSize,
  pushUploadChunk,
} from '@/api/transfers'
import { closeUpload } from '@/api/files'
import { isResultShape } from '@/dev/contract'
import { ErrorCode } from '@/types/errorCode'
import { joinServerPath, type InitUploadFolderDTO } from '@/types/file'
import { isAxiosError } from 'axios'

/** 仅用于离线模拟；在线模式一次发送整文件或断点后的全部剩余内容。 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024
const MOCK_TICK_MS = 120

const sourceFiles = new Map<string, File>()
const sourceHandles = new Map<string, FileSystemFileHandleLike>()
const destinationHandles = new Map<string, FileSystemFileHandleLike>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const controllers = new Map<string, AbortController>()
const persistenceQueues = new Map<string, Promise<void>>()
/** 进度类写入节流；状态变更 / 终态立即落盘。 */
const PERSIST_PROGRESS_MS = 1000
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

function transferId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isTerminal(status: TransferStatus): boolean {
  return status === 'completed' || status === 'canceled'
}

function isActive(status: TransferStatus): boolean {
  return status === 'running' || status === 'waiting_backend'
}

function needsImmediatePersist(status: TransferStatus): boolean {
  return (
    isTerminal(status) ||
    status === 'paused' ||
    status === 'failed' ||
    status === 'needs_source' ||
    status === 'needs_destination' ||
    status === 'queued'
  )
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
  /** 已调过 closeUploadFolder 的文件夹 key，避免重复关闭。 */
  const closedFolderKeys = new Set<string>()
  const lastCompletedUpload = ref<{ id: string; targetPath: string; fileName: string; at: number } | null>(
    null,
  )

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
    const previous = tasks.value[index]!
    const nextStatus = patch.status ?? previous.status
    const enteringTerminal = isTerminal(nextStatus) && !isTerminal(previous.status)
    const leavingTerminal = !isTerminal(nextStatus) && isTerminal(previous.status)
    const now = Date.now()
    const task: TransferTask = {
      ...previous,
      ...patch,
      updatedAt: now,
      completedAt: leavingTerminal
        ? undefined
        : patch.completedAt !== undefined
          ? patch.completedAt
          : enteringTerminal
            ? now
            : previous.completedAt,
    }
    tasks.value[index] = task
    if (enteringTerminal && task.status === 'completed' && task.direction === 'upload') {
      lastCompletedUpload.value = {
        id: task.id,
        targetPath: task.targetPath,
        fileName: task.fileName,
        at: now,
      }
    }
    const statusChanged = previous.status !== task.status
    if (statusChanged || needsImmediatePersist(task.status)) {
      const pending = persistTimers.get(id)
      if (pending) {
        clearTimeout(pending)
        persistTimers.delete(id)
      }
      void persist(task)
    } else {
      scheduleProgressPersist(id)
    }
    if (statusChanged && task.folderGroupId && !isActive(task.status)) {
      const groupId = task.folderGroupId
      queueMicrotask(() => settleFolderGroup(groupId))
    }
    return task
  }

  /**
   * 文件夹组内逐个上传：当前没有在跑的就启动下一个 queued；
   * 全部完成 / 取消后关闭整个文件夹会话。失败项留着等重试，不关会话。
   */
  function settleFolderGroup(groupId: string) {
    const group = tasks.value.filter((task) => task.folderGroupId === groupId)
    if (group.length === 0) {
      return
    }
    if (group.every((task) => isTerminal(task.status))) {
      const uploadKey = group[0]!.serverTransferId
      if (uploadKey && readApiMode() === 'online' && !closedFolderKeys.has(uploadKey)) {
        closedFolderKeys.add(uploadKey)
        void finishFolderUpload(uploadKey).catch(() => undefined)
      }
      return
    }
    if (group.some((task) => isActive(task.status))) {
      return
    }
    const next = group.find((task) => task.status === 'queued')
    if (next) {
      begin(next.id)
    }
  }

  function scheduleProgressPersist(id: string) {
    if (persistTimers.has(id)) {
      return
    }
    persistTimers.set(
      id,
      setTimeout(() => {
        persistTimers.delete(id)
        const current = taskById(id)
        if (current) {
          void persist(current)
        }
      }, PERSIST_PROGRESS_MS),
    )
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
      const restoredStatus = restoredTransferStatus(
        record.task,
        Boolean(record.sourceHandle),
        Boolean(record.destinationHandle),
        online,
      )
      const task: TransferTask = {
        ...record.task,
        status: restoredStatus,
        speedBps: 0,
        remainingSeconds: null,
        completedAt:
          record.task.completedAt ??
          (isTerminal(restoredStatus) ? record.task.updatedAt || record.task.createdAt : undefined),
      }
      tasks.value.push(task)
    }
    hydrated.value = true
  }

  function stopRuntime(id: string) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    const persistTimer = persistTimers.get(id)
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimers.delete(id)
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
      await (task.folderGroupId ? runOnlineFolderUpload(id) : runOnlineUpload(id))
      return
    }
    await runOnlineDownload(id)
  }

  function codeOf(result: unknown, fallback: number): number {
    return isResultShape(result) ? result.code : fallback
  }

  /**
   * 从 offset 起把剩余字节一次发完；请求中断时查服务端已落盘字节再续。
   * 'done' = 已到文件尾；'stopped' = 已中止或已记失败。网络异常抛给调用方。
   */
  async function streamRemaining(options: {
    id: string
    file: File
    controller: AbortController
    offset: number
    push: (
      from: number,
      onProgress?: (loaded: number, requestBytes: number) => void,
    ) => Promise<{ ok: boolean; nextOffset: number; result?: unknown }>
    probe: () => Promise<{ ok: boolean; nextOffset?: number }>
  }): Promise<'done' | 'stopped'> {
    const { id, file, controller } = options
    let offset = options.offset
    let recoveryAttempts = 0

    if (file.size === 0) {
      const empty = await options.push(0)
      if (!empty.ok) {
        failTask(id, codeOf(empty.result, ErrorCode.FILE_OPERATION_FAILED))
        return 'stopped'
      }
      return controller.signal.aborted ? 'stopped' : 'done'
    }

    while (offset < file.size) {
      if (controller.signal.aborted) {
        return 'stopped'
      }
      const startedAt = Date.now()
      const previous = offset
      let pushed
      try {
        pushed = await options.push(offset, (loaded, requestBytes) => {
          if (controller.signal.aborted) {
            return
          }
          const transferred = Math.min(file.size, previous + loaded)
          const elapsed = Math.max((Date.now() - startedAt) / 1000, 0.001)
          const speedBps = Math.round(loaded / elapsed)
          const left = Math.max(0, file.size - transferred)
          const waitingForBackend = loaded >= requestBytes
          patchTask(id, {
            status: waitingForBackend ? 'waiting_backend' : 'running',
            transferredBytes: transferred,
            nextOffset: transferred,
            speedBps: waitingForBackend ? 0 : speedBps,
            remainingSeconds:
              !waitingForBackend && speedBps > 0 ? Math.ceil(left / speedBps) : null,
          })
        })
      } catch (error) {
        if (controller.signal.aborted) {
          return 'stopped'
        }
        // 请求体可能已写入，但响应在代理/隧道处断开。查询服务端实际字节，
        // 再按断点重连继续，避免重复追加或直接报 99999。
        const recovered = await options.probe()
        const next = recovered.nextOffset ?? -1
        if (!recovered.ok || next < 0 || next > file.size) {
          throw error
        }
        recoveryAttempts = next > previous ? 0 : recoveryAttempts + 1
        if (recoveryAttempts > 3) {
          throw error
        }
        offset = next
        patchTask(id, {
          transferredBytes: offset,
          nextOffset: offset,
          speedBps: 0,
          remainingSeconds: null,
        })
        continue
      }
      if (!pushed.ok) {
        failTask(id, codeOf(pushed.result, ErrorCode.FILE_OPERATION_FAILED))
        return 'stopped'
      }
      recoveryAttempts = 0
      // 正常上传一次即到文件尾；查断点仅用于暂停/中断后的恢复。
      offset = pushed.nextOffset
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
    return controller.signal.aborted ? 'stopped' : 'done'
  }

  /** 文件夹内单个文件：共用文件夹 key，按 filePath 上传；续传前查 getUploadedFolderStatus。 */
  async function runOnlineFolderUpload(id: string) {
    const file = sourceFiles.get(id)
    if (!file) {
      patchTask(id, { status: 'needs_source', speedBps: 0, remainingSeconds: null })
      return
    }
    stopRuntime(id)
    const controller = new AbortController()
    controllers.set(id, controller)
    const task = patchTask(id, {
      status: 'running',
      errorCode: undefined,
      errorMessage: undefined,
      chunkSize: DEFAULT_CHUNK_SIZE,
    })
    if (!task) {
      return
    }
    const uploadKey = task.serverTransferId
    const filePath = task.serverFilePath
    if (!uploadKey || !filePath) {
      failTask(id, ErrorCode.UPLOAD_KEY_NOT_FOUND)
      return
    }

    try {
      let offset = 0
      if (task.folderStarted) {
        const probed = await probeFolderFile(uploadKey, filePath)
        if (!probed.ok) {
          failTask(id, codeOf(probed.result, ErrorCode.EXCEPTION))
          return
        }
        if (probed.done) {
          await finishFolderFile(uploadKey, filePath).catch(() => undefined)
          completeUpload(id, file.size)
          return
        }
        if (probed.nextOffset > file.size) {
          failTask(id, ErrorCode.FILE_OPERATION_FAILED, 'SERVER_SIZE_EXCEEDS_SOURCE')
          return
        }
        offset = probed.nextOffset
      }
      patchTask(id, { folderStarted: true, nextOffset: offset, transferredBytes: offset })

      const streamed = await streamRemaining({
        id,
        file,
        controller,
        offset,
        push: (from, onProgress) =>
          pushUploadChunk({
            uploadKey,
            filePath,
            file,
            offset: from,
            signal: controller.signal,
            onProgress,
            mode: 'folder',
          }),
        probe: async () => {
          const probed = await probeFolderFile(uploadKey, filePath)
          if (!probed.ok) {
            return { ok: false }
          }
          return { ok: true, nextOffset: probed.done ? file.size : probed.nextOffset }
        },
      })
      if (streamed !== 'done') {
        return
      }
      const closed = await finishFolderFile(uploadKey, filePath)
      if (!isResultShape(closed.data) || closed.data.code !== ErrorCode.OK) {
        failTask(id, codeOf(closed.data, ErrorCode.FILE_OPERATION_FAILED))
        return
      }
      completeUpload(id, file.size)
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

  function completeUpload(id: string, size: number) {
    patchTask(id, {
      status: 'completed',
      transferredBytes: size,
      nextOffset: size,
      speedBps: 0,
      remainingSeconds: 0,
    })
    sourceFiles.delete(id)
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
      const uploadFilePath = joinServerPath(task.targetPath, file.name)

      if (!uploadKey) {
        const allocated = await allocateUploadKey(uploadFilePath)
        if (!allocated.ok) {
          const code = isResultShape(allocated.result) ? allocated.result.code : ErrorCode.EXCEPTION
          failTask(id, code)
          return
        }
        uploadKey = allocated.uploadKey
        offset = 0
        task = patchTask(id, { serverTransferId: uploadKey, nextOffset: 0, transferredBytes: 0 }) ?? task
      } else {
        const probed = await probeUploadedSize(uploadKey)
        if (probed.ok) {
          offset = probed.nextOffset
          patchTask(id, { nextOffset: offset, transferredBytes: offset })
        } else {
          const code = isResultShape(probed.result) ? probed.result.code : ErrorCode.EXCEPTION
          if (code !== ErrorCode.UPLOAD_KEY_NOT_FOUND) {
            failTask(id, code)
            return
          }
          const allocated = await allocateUploadKey(uploadFilePath)
          if (!allocated.ok) {
            const allocateCode = isResultShape(allocated.result)
              ? allocated.result.code
              : ErrorCode.EXCEPTION
            failTask(id, allocateCode)
            return
          }
          uploadKey = allocated.uploadKey
          offset = 0
          task =
            patchTask(id, {
              serverTransferId: uploadKey,
              nextOffset: 0,
              transferredBytes: 0,
            }) ?? task
        }
      }

      const streamed = await streamRemaining({
        id,
        file,
        controller,
        offset,
        push: (from, onProgress) =>
          pushUploadChunk({
            uploadKey,
            filePath: uploadFilePath,
            file,
            offset: from,
            signal: controller.signal,
            onProgress,
          }),
        probe: () => probeUploadedSize(uploadKey),
      })
      if (streamed !== 'done') {
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

  /**
   * 文件夹上传：先把所有文件夹（逐级）和文件登记给 initUploadFolder 拿一个 key，
   * 再按文件建任务，组内逐个上传。baseDir 为当前目录的服务端路径，dirSegments 已净化。
   */
  async function enqueueFolderUpload(input: {
    baseDir: string
    items: ReadonlyArray<{ file: File; dirSegments: readonly string[] }>
  }): Promise<{ ok: true; tasks: TransferTask[] } | { ok: false; code: number }> {
    await hydrate()
    if (input.items.length === 0) {
      return { ok: false, code: ErrorCode.ARGS_ILLEGAL }
    }
    const base = input.baseDir.replace(/[\\/]+$/, '')
    const dirEntries: InitUploadFolderDTO[] = []
    const fileEntries: InitUploadFolderDTO[] = []
    const seenDirs = new Set<string>()
    const planned: Array<{ file: File; dirPath: string; filePath: string }> = []
    for (const item of input.items) {
      for (let depth = 1; depth <= item.dirSegments.length; depth += 1) {
        const dirPath = [base, ...item.dirSegments.slice(0, depth)].join('/')
        if (!seenDirs.has(dirPath)) {
          seenDirs.add(dirPath)
          dirEntries.push({ is_file: false, uploadFilePath: dirPath })
        }
      }
      const dirPath = [base, ...item.dirSegments].join('/')
      const filePath = joinServerPath(dirPath, item.file.name)
      fileEntries.push({ is_file: true, uploadFilePath: filePath })
      planned.push({ file: item.file, dirPath, filePath })
    }

    let uploadKey: string | undefined
    if (readApiMode() === 'online') {
      try {
        const allocated = await allocateFolderUploadKey([...dirEntries, ...fileEntries])
        if (!allocated.ok) {
          return { ok: false, code: codeOf(allocated.result, ErrorCode.EXCEPTION) }
        }
        uploadKey = allocated.uploadKey
      } catch (error) {
        const code =
          isAxiosError(error) && error.response && isResultShape(error.response.data)
            ? error.response.data.code
            : ErrorCode.EXCEPTION
        return { ok: false, code }
      }
    }

    const groupId = transferId()
    const now = Date.now()
    const created = planned.map<TransferTask>((entry) => ({
      id: transferId(),
      serverTransferId: uploadKey,
      direction: 'upload',
      status: 'queued',
      fileName: entry.file.name,
      totalBytes: entry.file.size,
      transferredBytes: 0,
      nextOffset: 0,
      chunkSize: DEFAULT_CHUNK_SIZE,
      sourcePath: entry.file.name,
      targetPath: entry.dirPath,
      saveLocation: entry.dirPath,
      saveStrategy: 'browser-download',
      speedBps: 0,
      remainingSeconds: null,
      createdAt: now,
      updatedAt: now,
      folderGroupId: groupId,
      serverFilePath: entry.filePath,
    }))
    created.forEach((task, index) => sourceFiles.set(task.id, planned[index]!.file))
    tasks.value.unshift(...created)
    await Promise.all(created.map((task) => persist(task)))
    settleFolderGroup(groupId)
    return { ok: true, tasks: created }
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
    // 文件夹任务共用 key：单个取消不关会话，组内全部结束后由 settleFolderGroup 关。
    if (task.direction === 'upload' && uploadKey && !task.folderGroupId && readApiMode() === 'online') {
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
      completedAt: undefined,
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
    lastCompletedUpload,
    hydrate,
    enqueueUpload,
    enqueueFolderUpload,
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
