import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  restoredTransferStatus,
  transferProgress,
  useTransferStore,
} from './transfers'
import type { TransferTask } from '@/types/transfer'

const transferApi = vi.hoisted(() => ({
  allocateUploadKey: vi.fn(),
  probeUploadedSize: vi.fn(),
  pushUploadChunk: vi.fn(),
  finishUpload: vi.fn(),
  downloadContinuableWithProgress: vi.fn(),
  allocateFolderUploadKey: vi.fn(),
  probeFolderFile: vi.fn(),
  finishFolderFile: vi.fn(),
  finishFolderUpload: vi.fn(),
}))

vi.mock('@/api/transfers', () => transferApi)
vi.mock('@/api/files', () => ({
  closeUpload: vi.fn().mockResolvedValue({ data: { code: 1, data: null } }),
}))

function task(patch: Partial<TransferTask> = {}): TransferTask {
  return {
    id: 'task-1',
    direction: 'upload',
    status: 'running',
    fileName: 'large.bin',
    totalBytes: 100,
    transferredBytes: 25,
    nextOffset: 25,
    chunkSize: 10,
    sourcePath: 'large.bin',
    targetPath: './files/1',
    saveLocation: './files/1',
    saveStrategy: 'browser-download',
    speedBps: 0,
    remainingSeconds: null,
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  }
}

describe('断点传输状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    transferApi.allocateUploadKey.mockReset()
    transferApi.probeUploadedSize.mockReset()
    transferApi.pushUploadChunk.mockReset()
    transferApi.finishUpload.mockReset()
    transferApi.downloadContinuableWithProgress.mockReset()
    transferApi.allocateFolderUploadKey.mockReset()
    transferApi.probeFolderFile.mockReset()
    transferApi.finishFolderFile.mockReset()
    transferApi.finishFolderUpload.mockReset()
  })

  function goOnline() {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'apiMode' ? 'online' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  }

  it('文件夹上传：一次登记目录与文件，组内逐个上传并逐个关闭，最后关闭整个会话', async () => {
    goOnline()
    transferApi.allocateFolderUploadKey.mockResolvedValue({ ok: true, uploadKey: 'fk' })
    const order: string[] = []
    let inflight = 0
    let maxInflight = 0
    transferApi.pushUploadChunk.mockImplementation(
      async ({ file, filePath }: { file: File; filePath: string }) => {
        order.push(filePath)
        inflight += 1
        maxInflight = Math.max(maxInflight, inflight)
        await new Promise((resolve) => setTimeout(resolve, 10))
        inflight -= 1
        return { ok: true, nextOffset: file.size }
      },
    )
    transferApi.finishFolderFile.mockResolvedValue({ data: { code: 1, data: null } })
    transferApi.finishFolderUpload.mockResolvedValue({ data: { code: 1, data: null } })

    const store = useTransferStore()
    const queued = await store.enqueueFolderUpload({
      baseDir: './files/1',
      items: [
        { file: new File(['aa'], 'a.txt'), dirSegments: ['docs', 'sub'] },
        { file: new File(['b'], 'b.txt'), dirSegments: ['docs'] },
      ],
    })
    expect(queued.ok).toBe(true)
    expect(transferApi.allocateFolderUploadKey).toHaveBeenCalledWith([
      { is_file: false, uploadFilePath: './files/1/docs' },
      { is_file: false, uploadFilePath: './files/1/docs/sub' },
      { is_file: true, uploadFilePath: './files/1/docs/sub/a.txt' },
      { is_file: true, uploadFilePath: './files/1/docs/b.txt' },
    ])
    await vi.runAllTimersAsync()

    // 同一时刻组内只跑一个
    expect(maxInflight).toBe(1)

    expect(order).toEqual(['./files/1/docs/sub/a.txt', './files/1/docs/b.txt'])
    expect(transferApi.pushUploadChunk.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ uploadKey: 'fk', mode: 'folder', offset: 0 }),
    )
    expect(transferApi.finishFolderFile).toHaveBeenCalledTimes(2)
    expect(transferApi.finishFolderUpload).toHaveBeenCalledTimes(1)
    expect(transferApi.finishFolderUpload).toHaveBeenCalledWith('fk')
    expect(transferApi.probeFolderFile).not.toHaveBeenCalled()
    expect(store.tasks.every((task) => task.status === 'completed')).toBe(true)
  })

  it('文件夹登记失败时不建任务', async () => {
    goOnline()
    transferApi.allocateFolderUploadKey.mockResolvedValue({ ok: false, result: { code: 20001, data: null } })
    const store = useTransferStore()
    const queued = await store.enqueueFolderUpload({
      baseDir: './files/1',
      items: [{ file: new File(['a'], 'a.txt'), dirSegments: ['docs'] }],
    })
    expect(queued).toEqual({ ok: false, code: 20001 })
    expect(store.tasks).toHaveLength(0)
  })

  it('文件夹任务续传前按 getUploadedFolderStatus 跳过已落盘字节', async () => {
    goOnline()
    transferApi.allocateFolderUploadKey.mockResolvedValue({ ok: true, uploadKey: 'fk' })
    let calls = 0
    transferApi.pushUploadChunk.mockImplementation(async ({ file }: { file: File }) => {
      calls += 1
      if (calls === 1) {
        return { ok: false, result: { code: 99999, data: null }, nextOffset: 0 }
      }
      return { ok: true, nextOffset: file.size }
    })
    transferApi.probeFolderFile.mockResolvedValue({ ok: true, done: false, nextOffset: 4 })
    transferApi.finishFolderFile.mockResolvedValue({ data: { code: 1, data: null } })
    transferApi.finishFolderUpload.mockResolvedValue({ data: { code: 1, data: null } })

    const store = useTransferStore()
    await store.enqueueFolderUpload({
      baseDir: './files/1',
      items: [{ file: new File(['0123456789'], 'a.txt'), dirSegments: ['docs'] }],
    })
    await vi.runAllTimersAsync()
    const id = store.tasks[0]!.id
    expect(store.tasks[0]?.status).toBe('failed')
    expect(transferApi.finishFolderUpload).not.toHaveBeenCalled()

    store.retry(id)
    await vi.runAllTimersAsync()
    expect(transferApi.probeFolderFile).toHaveBeenCalledWith('fk', './files/1/docs/a.txt')
    expect(transferApi.pushUploadChunk.mock.calls[1]?.[0]).toEqual(expect.objectContaining({ offset: 4 }))
    expect(store.tasks[0]?.status).toBe('completed')
    expect(transferApi.finishFolderUpload).toHaveBeenCalledWith('fk')
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('按字节计算并限制进度', () => {
    expect(transferProgress(task())).toBe(25)
    expect(transferProgress(task({ transferredBytes: 150 }))).toBe(100)
    expect(transferProgress(task({ totalBytes: 0, transferredBytes: 0 }))).toBe(100)
  })

  it('刷新后缺少来源或保存句柄时要求用户重新选择', () => {
    expect(restoredTransferStatus(task(), false, false, false)).toBe('needs_source')
    expect(
      restoredTransferStatus(
        task({ direction: 'download', saveStrategy: 'file-system-access' }),
        false,
        false,
        false,
      ),
    ).toBe('needs_destination')
    expect(restoredTransferStatus(task(), true, false, true)).toBe('paused')
  })

  it('在线模式走真实 continuable 上传', async () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'apiMode' ? 'online' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    transferApi.allocateUploadKey.mockResolvedValue({ ok: true, uploadKey: 'up-1' })
    transferApi.pushUploadChunk.mockImplementation(
      async ({ file }: { file: File }) => ({
        ok: true,
        nextOffset: file.size,
      }),
    )
    transferApi.finishUpload.mockResolvedValue({ data: { code: 1, data: null } })

    const store = useTransferStore()
    await store.enqueueUpload(new File(['payload'], 'large.bin'), './files/1')
    await Promise.resolve()
    await Promise.resolve()

    expect(transferApi.allocateUploadKey).toHaveBeenCalledWith('./files/1/large.bin')
    expect(transferApi.pushUploadChunk).toHaveBeenCalledTimes(1)
    expect(transferApi.pushUploadChunk.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ offset: 0 }),
    )
    // 正常上传不查 getUploadedSize；仅暂停/中断后续传才 probe。
    expect(transferApi.probeUploadedSize).not.toHaveBeenCalled()
    expect(transferApi.finishUpload).toHaveBeenCalledWith('up-1')
    expect(store.tasks[0]?.status).toBe('completed')
    expect(store.tasks[0]?.serverTransferId).toBe('up-1')
    expect(store.tasks[0]?.completedAt).toEqual(expect.any(Number))
    expect(store.lastCompletedUpload).toEqual(
      expect.objectContaining({
        id: store.tasks[0]?.id,
        targetPath: './files/1',
        fileName: 'large.bin',
      }),
    )
    expect(store.tasks[0]?.createdAt).toEqual(expect.any(Number))
  })

  it('离线执行器支持暂停、继续和完成', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'offline',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    const store = useTransferStore()
    const queued = await store.enqueueUpload(
      new File([new Uint8Array(10 * 1024 * 1024)], 'large.bin'),
      './files/1',
    )
    expect(store.tasks[0]?.status).toBe('running')
    expect(store.tasks[0]?.completedAt).toBeUndefined()

    await vi.advanceTimersByTimeAsync(130)
    expect(store.tasks[0]?.transferredBytes).toBeGreaterThan(0)
    store.pause(queued.id)
    const pausedAt = store.tasks[0]?.transferredBytes
    await vi.advanceTimersByTimeAsync(500)
    expect(store.tasks[0]?.transferredBytes).toBe(pausedAt)

    await store.resume(queued.id)
    await vi.runAllTimersAsync()
    expect(store.tasks[0]?.status).toBe('completed')
    expect(store.tasks[0]?.transferredBytes).toBe(10 * 1024 * 1024)
    expect(store.tasks[0]?.completedAt).toEqual(expect.any(Number))
  })

  it('取消任务后停止进度', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'offline',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    const store = useTransferStore()
    const queued = await store.enqueueUpload(new File(['payload'], 'a.txt'), './files/1')
    store.cancel(queued.id)
    await vi.runAllTimersAsync()
    expect(store.tasks[0]?.status).toBe('canceled')
    expect(store.tasks[0]?.transferredBytes).toBe(0)
    expect(store.tasks[0]?.completedAt).toEqual(expect.any(Number))
  })
})
