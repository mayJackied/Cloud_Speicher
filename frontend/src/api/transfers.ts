import {
  closeUpload,
  continuableUploadFile,
  getUploadedSize,
  initUpload,
} from './files'
import { api } from './client'
import { isResultShape } from '@/dev/contract'
import { ErrorCode } from '@/types/errorCode'
import { DownloadType } from '@/types/file'
import type { AxiosProgressEvent } from 'axios'

export async function allocateUploadKey(uploadFilePath: string) {
  const init = await initUpload(uploadFilePath)
  if (!isResultShape(init.data) || init.data.code !== ErrorCode.OK || !init.data.data) {
    return { ok: false as const, result: init.data }
  }
  return { ok: true as const, uploadKey: String(init.data.data) }
}

export async function probeUploadedSize(uploadKey: string) {
  const probed = await getUploadedSize({ uploadKey })
  if (!isResultShape(probed.data) || probed.data.code !== ErrorCode.OK) {
    return { ok: false as const, result: probed.data }
  }
  return { ok: true as const, nextOffset: Number(probed.data.data ?? 0) }
}

export async function pushUploadChunk(options: {
  uploadKey: string
  targetPath: string
  file: File
  offset: number
  signal?: AbortSignal
  onProgress?: (loadedInChunk: number, chunkBytes: number) => void
}) {
  // 原始请求体会被后端边接收边追加；恢复时仅发送服务端 offset 后的剩余内容。
  const end = options.file.size
  const chunkBytes = end - options.offset
  const chunk = options.file.slice(options.offset, end)
  const uploaded = await continuableUploadFile(
    {
      uploadKey: options.uploadKey,
      targetPath: options.targetPath,
      file: chunk,
    },
    {
      signal: options.signal,
      onProgress: (event) => {
        const loaded = Math.min(chunkBytes, Math.max(0, event.loaded))
        options.onProgress?.(loaded, chunkBytes)
      },
    },
  )
  if (!isResultShape(uploaded.data) || uploaded.data.code !== ErrorCode.OK) {
    return { ok: false as const, result: uploaded.data, nextOffset: options.offset }
  }
  return { ok: true as const, nextOffset: end }
}

export function finishUpload(uploadKey: string) {
  return closeUpload({ uploadKey })
}

export function downloadContinuableWithProgress(options: {
  path: string
  downloadedSize?: number
  onProgress?: (event: AxiosProgressEvent) => void
  signal?: AbortSignal
}) {
  const downloadedSize = options.downloadedSize ?? 0
  return api.post(
    '/file/downloadFile',
    {
      downloadFilePath: options.path,
      downloadedSize,
      downloadType: downloadedSize > 0 ? DownloadType.RESUME : DownloadType.FIRST,
    },
    {
      responseType: 'blob',
      timeout: 0,
      signal: options.signal,
      onDownloadProgress: options.onProgress,
    },
  )
}
