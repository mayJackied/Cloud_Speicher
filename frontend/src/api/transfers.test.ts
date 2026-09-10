import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { downloadContinuableWithProgress, pushUploadChunk } from './transfers'
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

  it('initUpload 走 POST 并发送目标文件完整路径', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void initUpload('../files/8/large.bin')
    expect(post).toHaveBeenCalledWith('/file/initUpload', '"../files/8/large.bin"')
  })

  it('continuableUpload 用原始字节流发送断点后的全部剩余内容', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    const file = new File([new Uint8Array(12)], 'large.bin')

    const result = await pushUploadChunk({
      uploadKey: 'k1',
      targetPath: '../files/1',
      file,
      offset: 5,
    })

    expect((post.mock.calls[0]?.[1] as Blob).size).toBe(7)
    expect(post.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        timeout: 0,
        params: { uploadKey: 'k1', targetPath: '../files/1' },
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    )
    expect(result).toEqual({ ok: true, nextOffset: 12 })
  })

  it('continuableUpload 不用固定超时截断大文件', async () => {
    const { continuableUploadFile } = await import('./files')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    await continuableUploadFile({
      uploadKey: 'k1',
      targetPath: '../files/1',
      file: new Blob(['x']),
    })
    expect(post).toHaveBeenCalledWith(
      '/file/continuableUploadFile',
      expect.any(Blob),
      expect.objectContaining({
        timeout: 0,
        params: { uploadKey: 'k1', targetPath: '../files/1' },
      }),
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
