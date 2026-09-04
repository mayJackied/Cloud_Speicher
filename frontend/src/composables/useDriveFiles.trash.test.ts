import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { FilesVO } from '@/types/file'

const api = vi.hoisted(() => ({
  addFile: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
  getFiles: vi.fn(),
  moveFile: vi.fn(),
  renameFile: vi.fn(),
  uploadFile: vi.fn(),
}))

vi.mock('@/api/files', () => api)

import { useDriveFiles } from './useDriveFiles'
import { useAuthStore } from '@/stores/auth'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

function folder(fileName: string, filesVOS: FilesVO[] = []): FilesVO {
  return { fileName, isFile: false, length: 0, lastModified: 1, filesVOS }
}

function file(fileName: string, length = 12): FilesVO {
  return { fileName, isFile: true, length, lastModified: 1, filesVOS: null }
}

describe('useDriveFiles 回收站还原', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    setActivePinia(createPinia())
    useAuthStore().setSession({
      token: 'test-token',
      userId: 8,
      name: 'tester',
      isAdmin: false,
    })
  })

  it('本机没有索引时读取远端 meta，并还原到原目录而非房间根', async () => {
    const storedName = '$Rabc123.txt'
    const tree = [
      folder('public'),
      folder('8', [
        folder('docs'),
        folder('recycle_bin', [file(storedName)]),
      ]),
    ]
    const ok = { data: { code: 1, data: null } }
    api.getFiles.mockResolvedValue({ data: { code: 1, data: tree } })
    api.downloadFile.mockResolvedValue({
      data: new Blob([
        JSON.stringify({
          [storedName]: { from: '../files/8/docs', name: 'report.txt' },
        }),
      ]),
      headers: { 'content-type': 'application/octet-stream' },
    })
    api.renameFile.mockResolvedValue(ok)
    api.moveFile.mockResolvedValue(ok)
    api.uploadFile.mockResolvedValue(ok)
    api.deleteFile.mockResolvedValue(ok)

    const drive = useDriveFiles()
    await drive.load()
    drive.goPath(['8', 'recycle_bin'])
    const trashed = drive.currentItems.value[0]
    expect(trashed?.fileName).toBe(storedName)

    await drive.restoreItem(trashed!)

    expect(api.downloadFile).toHaveBeenCalledWith({
      path: '../files/8/recycle_bin/_trash_meta.json',
    })
    expect(api.moveFile).toHaveBeenCalledWith({
      path: '../files/8/recycle_bin/report.txt',
      targetDir: '../files/8/docs',
      fileHandle: 0,
    })
    expect(api.moveFile).not.toHaveBeenCalledWith(
      expect.objectContaining({ targetDir: '../files/8' }),
    )
  })

  it('没有本地或远端索引时拒绝静默还原到房间根', async () => {
    const storedName = '$Rmissing.txt'
    const tree = [
      folder('public'),
      folder('8', [folder('recycle_bin', [file(storedName)])]),
    ]
    api.getFiles.mockResolvedValue({ data: { code: 1, data: tree } })
    api.downloadFile.mockRejectedValue(new Error('missing meta'))

    const drive = useDriveFiles()
    await drive.load()
    drive.goPath(['8', 'recycle_bin'])
    await drive.restoreItem(drive.currentItems.value[0]!)

    expect(api.moveFile).not.toHaveBeenCalled()
    expect(drive.message.value).toBe('文件不存在')
  })
})
