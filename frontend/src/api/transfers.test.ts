import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import {
  downloadContinuableWithProgress,
  probeFolderFile,
  pushUploadChunk,
  sameServerPath,
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

  it('initUpload 走 POST 并发送 InitUploadDTO', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void initUpload('./files/8/large.bin')
    expect(post).toHaveBeenCalledWith('/file/initUpload', {
      uploadFilePath: './files/8/large.bin',
    })
  })

  it('continuableUpload 用原始字节流发送断点后的全部剩余内容', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    const file = new File([new Uint8Array(12)], 'large.bin')

    const result = await pushUploadChunk({
      uploadKey: 'k1',
      filePath: './files/1/large.bin',
      file,
      offset: 5,
    })

    expect((post.mock.calls[0]?.[1] as Blob).size).toBe(7)
    expect(post.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        timeout: 0,
        params: { uploadKey: 'k1', filePath: './files/1/large.bin' },
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
      filePath: './files/1/x.bin',
      file: new Blob(['x']),
    })
    expect(post).toHaveBeenCalledWith(
      '/file/continuableUploadFile',
      expect.any(Blob),
      expect.objectContaining({
        timeout: 0,
        params: { uploadKey: 'k1', filePath: './files/1/x.bin' },
      }),
    )
  })

  it('文件夹会话：initUploadFolder 发列表，uploadFolder 带 uploadKey + filePath', async () => {
    const { initUploadFolder } = await import('./files')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { code: 1, data: null } } as never)
    void initUploadFolder([
      { is_file: false, uploadFilePath: './files/1/docs' },
      { is_file: true, uploadFilePath: './files/1/docs/a.txt' },
    ])
    await pushUploadChunk({
      uploadKey: 'fk',
      filePath: './files/1/docs/a.txt',
      file: new File(['abc'], 'a.txt'),
      offset: 1,
      mode: 'folder',
    })
    expect(post).toHaveBeenNthCalledWith(1, '/file/initUploadFolder', [
      { is_file: false, uploadFilePath: './files/1/docs' },
      { is_file: true, uploadFilePath: './files/1/docs/a.txt' },
    ])
    expect(post.mock.calls[1]?.[0]).toBe('/file/uploadFolder')
    expect((post.mock.calls[1]?.[1] as Blob).size).toBe(2)
    expect(post.mock.calls[1]?.[2]).toEqual(
      expect.objectContaining({ params: { uploadKey: 'fk', filePath: './files/1/docs/a.txt' } }),
    )
  })

  it('getUploadedFolderStatus 按路径找断点，兼容后端路径写法', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        code: 1,
        data: [
          { uploadFilePath: 'files\\1\\docs\\a.txt', status: 2, size: -1 },
          { uploadFilePath: './files/1/docs/b.txt', status: 1, size: 40 },
        ],
      },
    } as never)
    expect(await probeFolderFile('fk', './files/1/docs/a.txt')).toEqual({ ok: true, done: true, nextOffset: -1 })
    expect(await probeFolderFile('fk', './files/1/docs/b.txt')).toEqual({ ok: true, done: false, nextOffset: 40 })
    expect(await probeFolderFile('fk', './files/1/docs/c.txt')).toEqual({ ok: true, done: false, nextOffset: 0 })
    expect(sameServerPath('./files/1//x', 'files/1/x')).toBe(true)
  })

  it('下载使用 ContinuableDownloadDTO', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void downloadFile({
      downloadFilePath: './files/7/a.bin',
      downloadedSize: 10,
      downloadType: 1,
    })
    expect(post).toHaveBeenCalledWith(
      '/file/downloadFile',
      {
        downloadFilePath: './files/7/a.bin',
        downloadedSize: 10,
        downloadType: 1,
      },
      expect.objectContaining({ responseType: 'blob' }),
    )
  })

  it('进度下载与关闭上传、收藏列表端点正确', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    void downloadContinuableWithProgress({ path: './files/7/a.bin', downloadedSize: 0 })
    void closeUpload({ uploadKey: 'key-1' })
    void getStarredFiles()
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/file/downloadFile',
      expect.objectContaining({ downloadFilePath: './files/7/a.bin', downloadType: 0 }),
      expect.objectContaining({ responseType: 'blob' }),
    )
    expect(post).toHaveBeenNthCalledWith(2, '/file/closeUpload', { uploadKey: 'key-1' })
    expect(post).toHaveBeenNthCalledWith(3, '/file/getStarredFiles')
  })
})
