import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import {
  UPLOAD_CHUNK_SIZE,
  downloadContinuableWithProgress,
  pushUploadChunk,
} from './transfers'
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

  it('continuableUpload 使用低于 EOF 阈值的完整 multipart 分片', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    const file = new File([new Uint8Array(UPLOAD_CHUNK_SIZE + 3)], 'large.bin')

    const result = await pushUploadChunk({
      uploadKey: 'k1',
      targetPath: '../files/1',
      file,
      offset: 0,
      uploadType: 0,
    })

    const body = post.mock.calls[0]?.[1] as FormData
    expect(UPLOAD_CHUNK_SIZE).toBe(4 * 1024 * 1024)
    expect((body.get('multipartFile') as Blob).size).toBe(UPLOAD_CHUNK_SIZE)
    expect(result).toEqual({ ok: true, nextOffset: UPLOAD_CHUNK_SIZE })
  })

  it('continuableUpload 不用固定超时截断大文件', async () => {
    const { continuableUploadFile } = await import('./files')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    await continuableUploadFile({
      uploadKey: 'k1',
      targetPath: '../files/1',
      file: new Blob(['x']),
      fileName: 'a.bin',
      uploadType: 0,
    })
    expect(post).toHaveBeenCalledWith(
      '/file/continuableUploadFile',
      expect.any(FormData),
      expect.objectContaining({ timeout: 0 }),
    )
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
