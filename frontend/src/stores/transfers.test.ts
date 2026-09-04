import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  restoredTransferStatus,
  transferProgress,
  useTransferStore,
} from './transfers'
import type { TransferTask } from '@/types/transfer'

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
    targetPath: '../files/1',
    saveLocation: '../files/1',
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
      restoredTransferStatus(task({ direction: 'download' }), false, false, false),
    ).toBe('needs_destination')
    expect(restoredTransferStatus(task(), true, false, true)).toBe('waiting_backend')
  })

  it('在线模式只创建等待后端的任务', async () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'apiMode' ? 'online' : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
    const store = useTransferStore()
    const queued = await store.enqueueUpload(new File(['payload'], 'large.bin'), '../files/1')
    expect(queued.status).toBe('queued')
    expect(store.tasks[0]?.status).toBe('waiting_backend')
    expect(store.tasks[0]?.transferredBytes).toBe(0)
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
      '../files/1',
    )
    expect(store.tasks[0]?.status).toBe('running')

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
  })

  it('取消任务后停止进度', async () => {
    const store = useTransferStore()
    const queued = await store.enqueueUpload(new File(['payload'], 'a.txt'), '../files/1')
    store.cancel(queued.id)
    await vi.runAllTimersAsync()
    expect(store.tasks[0]?.status).toBe('canceled')
    expect(store.tasks[0]?.transferredBytes).toBe(0)
  })
})
