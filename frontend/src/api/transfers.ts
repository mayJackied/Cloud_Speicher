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

/**
 * 当前 FRP/Tomcat 链路在约 5.5MB 的 multipart 请求处会 EOF。
 * 每个请求只携带 4MB 文件数据，确保 multipart 能完整解析并进入控制器。
 */
export const UPLOAD_CHUNK_SIZE = 4 * 1024 * 1024

export async function allocateUploadKey() {
  const init = await initUpload()
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
  uploadType: 0 | 1
  chunkSize?: number
  signal?: AbortSignal
  onProgress?: (loadedInChunk: number, chunkBytes: number) => void
}) {
  const chunkSize = options.chunkSize ?? UPLOAD_CHUNK_SIZE
  const end = Math.min(options.file.size, options.offset + chunkSize)
  const chunkBytes = end - options.offset
  const chunk = options.file.slice(options.offset, end)
  const uploaded = await continuableUploadFile(
    {
      uploadKey: options.uploadKey,
      targetPath: options.targetPath,
      file: chunk,
      fileName: options.file.name,
      uploadType: options.uploadType,
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
