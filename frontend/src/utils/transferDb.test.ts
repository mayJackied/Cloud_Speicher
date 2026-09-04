import { describe, expect, it } from 'vitest'
import { cloneableTransferRecord } from './transferDb'
import type { PersistedTransferRecord, TransferTask } from '@/types/transfer'

const task: TransferTask = {
  id: 'task-1',
  direction: 'upload',
  status: 'paused',
  fileName: 'a.bin',
  totalBytes: 10,
  transferredBytes: 4,
  nextOffset: 4,
  chunkSize: 4,
  sourcePath: 'a.bin',
  targetPath: '../files/1',
  saveLocation: '../files/1',
  saveStrategy: 'browser-download',
  speedBps: 0,
  remainingSeconds: null,
  createdAt: 1,
  updatedAt: 2,
}

describe('传输任务持久化降级', () => {
  it('句柄可克隆时保留句柄', () => {
    const handle = { kind: 'file' as const, name: 'a.bin', getFile: async () => new File([],'a.bin') }
    const record: PersistedTransferRecord = {
      id: task.id,
      ownerId: 1,
      task,
      sourceHandle: handle,
    }

    expect(cloneableTransferRecord(record, () => ({})).sourceHandle).toBe(handle)
  })

  it('句柄不可克隆时只保存任务，不丢失队列', () => {
    const record: PersistedTransferRecord = {
      id: task.id,
      ownerId: 1,
      task,
      sourceHandle: {
        kind: 'file',
        name: 'a.bin',
        getFile: async () => new File([], 'a.bin'),
      },
    }

    const saved = cloneableTransferRecord(record, () => {
      throw new DOMException('cannot clone', 'DataCloneError')
    })

    expect(saved.task).toEqual(task)
    expect(saved.sourceHandle).toBeUndefined()
  })
})
