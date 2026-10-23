import {
  closeOneUpload,
  closeUpload,
  closeUploadFolder,
  continuableUploadFile,
  getUploadedFolderStatus,
  getUploadedSize,
  initUpload,
  initUploadFolder,
  uploadFolderFile,
} from './files'
import { api } from './client'
import { isResultShape } from '@/dev/contract'
import { ErrorCode } from '@/types/errorCode'
import {
  DownloadType,
  FolderUploadStatus,
  canonicalizeServerPath,
  type InitUploadFolderDTO,
} from '@/types/file'
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
  /** 上传文件的完整服务端路径。 */
  filePath: string
  file: File
  offset: number
  signal?: AbortSignal
  onProgress?: (loadedInChunk: number, chunkBytes: number) => void
  /** 'folder' 走 `/uploadFolder`（文件夹会话共用 key），默认单文件 `/continuableUploadFile`。 */
  mode?: 'single' | 'folder'
}) {
  // 原始请求体会被后端边接收边追加；恢复时仅发送服务端 offset 后的剩余内容。
  const end = options.file.size
  const chunkBytes = end - options.offset
  const chunk = options.file.slice(options.offset, end)
  const send = options.mode === 'folder' ? uploadFolderFile : continuableUploadFile
  const uploaded = await send(
    {
      uploadKey: options.uploadKey,
      filePath: options.filePath,
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

/** 后端回的路径可能少 `./`、用反斜杠；比较前统一。 */
export function sameServerPath(a: string, b: string): boolean {
  const norm = (path: string) =>
    canonicalizeServerPath(path)
      .replace(/\/+/g, '/')
      .replace(/^\.\//, '')
  return norm(a) === norm(b)
}

export async function allocateFolderUploadKey(entries: InitUploadFolderDTO[]) {
  const init = await initUploadFolder(entries)
  if (!isResultShape(init.data) || init.data.code !== ErrorCode.OK || !init.data.data) {
    return { ok: false as const, result: init.data }
  }
  return { ok: true as const, uploadKey: String(init.data.data) }
}

/**
 * 查文件夹会话里某个文件的断点：done = 已传完；否则 nextOffset = 已落盘字节。
 * 列表里找不到该文件按未开始处理。
 */
export async function probeFolderFile(uploadKey: string, filePath: string) {
  const probed = await getUploadedFolderStatus({ uploadKey })
  if (!isResultShape(probed.data) || probed.data.code !== ErrorCode.OK) {
    return { ok: false as const, result: probed.data }
  }
  const rows = Array.isArray(probed.data.data) ? probed.data.data : []
  const row = rows.find(
    (item) => item && typeof item.uploadFilePath === 'string' && sameServerPath(item.uploadFilePath, filePath),
  )
  if (!row || row.status === FolderUploadStatus.PENDING) {
    return { ok: true as const, done: false, nextOffset: 0 }
  }
  if (row.status === FolderUploadStatus.DONE) {
    return { ok: true as const, done: true, nextOffset: -1 }
  }
  return { ok: true as const, done: false, nextOffset: Math.max(0, Number(row.size) || 0) }
}

export function finishFolderFile(uploadKey: string, filePath: string) {
  return closeOneUpload({ uploadKey, filePath })
}

export function finishFolderUpload(uploadKey: string) {
  return closeUploadFolder({ uploadKey })
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
