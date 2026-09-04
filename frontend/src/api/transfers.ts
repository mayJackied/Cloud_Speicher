import { api } from './client'
import type { Result } from '@/types/result'
import type {
  CompleteUploadDTO,
  CompleteUploadVO,
  DownloadMetadataVO,
  InitDownloadDTO,
  InitUploadDTO,
  TransferChunkVO,
  TransferSessionVO,
} from '@/types/transfer'

const BASE = '/file/transfer'

export function initUploadTransfer(dto: InitUploadDTO) {
  return api.post<Result<TransferSessionVO>>(`${BASE}/upload/init`, dto)
}

export function probeUploadTransfer(transferId: string) {
  return api.get<Result<TransferSessionVO>>(`${BASE}/upload/${transferId}`)
}

export function uploadTransferChunk(
  transferId: string,
  offset: number,
  chunk: Blob,
  totalBytes: number,
  chunkHash?: string,
) {
  const end = offset + chunk.size - 1
  return api.put<Result<TransferChunkVO>>(`${BASE}/upload/${transferId}`, chunk, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Range': `bytes ${offset}-${end}/${totalBytes}`,
      ...(chunkHash ? { 'X-Chunk-Hash': chunkHash } : {}),
    },
    timeout: 0,
  })
}

export function completeUploadTransfer(transferId: string, dto: CompleteUploadDTO) {
  return api.post<Result<CompleteUploadVO>>(`${BASE}/upload/${transferId}/complete`, dto)
}

export function cancelUploadTransfer(transferId: string) {
  return api.delete<Result<null>>(`${BASE}/upload/${transferId}`)
}

export function initDownloadTransfer(dto: InitDownloadDTO) {
  return api.post<Result<DownloadMetadataVO>>(`${BASE}/download/init`, dto)
}

export function downloadTransferRange(
  path: string,
  start: number,
  end: number,
  etag: string,
  transferId?: string,
) {
  return api.post<Blob>(
    `${BASE}/download/range`,
    { path, transferId },
    {
      responseType: 'blob',
      headers: {
        Range: `bytes=${start}-${end}`,
        'If-Range': etag,
      },
      timeout: 0,
    },
  )
}

export function cancelDownloadTransfer(transferId: string) {
  return api.delete<Result<null>>(`${BASE}/download/${transferId}`)
}
