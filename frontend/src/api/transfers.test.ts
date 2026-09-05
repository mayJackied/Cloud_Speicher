import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { downloadContinuableWithProgress, UPLOAD_CHUNK_SIZE } from './transfers'
import { closeUpload, downloadFile, getStarredFiles, initUpload } from './files'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('现网断点传输与星标适配层', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
    })
  })

  it('initUpload 走 GET /file/initUpload', () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({} as never)
    void initUpload()
    expect(get).toHaveBeenCalledWith('/file/initUpload')
  })

  it('分块大小与后端 buffer 对齐为 5MB', () => {
    expect(UPLOAD_CHUNK_SIZE).toBe(5 * 1024 * 1024)
  })

  it('下载使用 ContinuableDownloadDTO', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void downloadFile({
      downloadFilePath: '../files/7/a.bin',
      downloadedSize: 10,
      downloadType: 1,
    })
    expect(post).toHaveBeenCalledWith(
      '/file/downloadFile',
      {
        downloadFilePath: '../files/7/a.bin',
        downloadedSize: 10,
        downloadType: 1,
      },
      expect.objectContaining({ responseType: 'blob' }),
    )
  })

  it('进度下载与关闭上传、收藏列表端点正确', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void downloadContinuableWithProgress({ path: '../files/7/a.bin', downloadedSize: 0 })
    void closeUpload({ uploadKey: 'key-1' })
    void getStarredFiles()
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/file/downloadFile',
      expect.objectContaining({ downloadFilePath: '../files/7/a.bin', downloadType: 0 }),
      expect.objectContaining({ responseType: 'blob' }),
    )
    expect(post).toHaveBeenNthCalledWith(2, '/file/closeUpload', { uploadKey: 'key-1' })
    expect(post).toHaveBeenNthCalledWith(3, '/file/getStarredFiles')
  })
})
