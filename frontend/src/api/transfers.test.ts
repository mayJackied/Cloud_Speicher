import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import {
  completeUploadTransfer,
  downloadTransferRange,
  initUploadTransfer,
  uploadTransferChunk,
} from './transfers'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('断点传输适配层', () => {
  it('初始化请求带客户端幂等 ID 和文件元数据', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    const dto = {
      targetDir: '../files/7',
      fileName: 'large.bin',
      totalSize: 100,
      clientUploadId: 'client-1',
    }

    void initUploadTransfer(dto)

    expect(post).toHaveBeenCalledWith('/file/transfer/upload/init', dto)
  })

  it('分块请求带权威 offset 对应的 Content-Range', () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({} as never)
    const chunk = new Blob(['abcd'])

    void uploadTransferChunk('server-1', 8, chunk, 20, 'hash-1')

    expect(put).toHaveBeenCalledWith(
      '/file/transfer/upload/server-1',
      chunk,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': 'bytes 8-11/20',
          'X-Chunk-Hash': 'hash-1',
        }),
      }),
    )
  })

  it('完成与下载 Range 请求使用隔离端点', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)

    void completeUploadTransfer('server-1', { contentHash: 'full-hash' })
    void downloadTransferRange('../files/7/a.bin', 10, 19, '"etag"', 'down-1')

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/file/transfer/upload/server-1/complete',
      { contentHash: 'full-hash' },
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/file/transfer/download/range',
      { path: '../files/7/a.bin', transferId: 'down-1' },
      expect.objectContaining({
        responseType: 'blob',
        headers: {
          Range: 'bytes=10-19',
          'If-Range': '"etag"',
        },
      }),
    )
  })
})
