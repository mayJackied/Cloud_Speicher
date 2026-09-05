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

/** 与后端 `uploadBufferSize`（5MB）对齐的分块大小。 */
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024

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
}) {
  const chunkSize = options.chunkSize ?? UPLOAD_CHUNK_SIZE
  const end = Math.min(options.file.size, options.offset + chunkSize)
  const chunk = options.file.slice(options.offset, end)
  const uploaded = await continuableUploadFile({
    uploadKey: options.uploadKey,
    targetPath: options.targetPath,
    file: chunk,
    fileName: options.file.name,
    uploadType: options.uploadType,
  })
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
