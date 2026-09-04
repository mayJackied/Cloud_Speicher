export type TransferDirection = 'upload' | 'download'

export type TransferStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'waiting_backend'
  | 'needs_source'
  | 'needs_destination'
  | 'completed'
  | 'failed'
  | 'canceled'

export type TransferFilter = 'all' | 'upload' | 'download' | 'completed'
export type TransferSaveStrategy = 'file-system-access' | 'browser-download'

export interface TransferTask {
  id: string
  serverTransferId?: string
  direction: TransferDirection
  status: TransferStatus
  fileName: string
  totalBytes: number
  transferredBytes: number
  nextOffset: number
  chunkSize: number
  sourcePath: string
  targetPath: string
  saveLocation: string
  saveStrategy: TransferSaveStrategy
  speedBps: number
  remainingSeconds: number | null
  etag?: string
  errorCode?: number
  errorMessage?: string
  createdAt: number
  updatedAt: number
}

export interface FileSystemFileHandleLike {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  createWritable?(): Promise<{
    write(data: Blob | BufferSource | string): Promise<void>
    close(): Promise<void>
    abort?(): Promise<void>
  }>
  queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<
    'granted' | 'denied' | 'prompt'
  >
  requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<
    'granted' | 'denied' | 'prompt'
  >
}

export interface PersistedTransferRecord {
  id: string
  ownerId: number
  task: TransferTask
  sourceHandle?: FileSystemFileHandleLike
  destinationHandle?: FileSystemFileHandleLike
}

export interface ByteRange {
  start: number
  end: number
}

export interface TransferSessionVO {
  transferId: string
  direction: TransferDirection
  state: 'created' | 'transferring' | 'committing' | 'completed' | 'aborted' | 'expired'
  totalSize: number
  nextOffset: number
  chunkSize: number
  etag?: string
  expiresAt: number
  targetPath?: string
}

export interface InitUploadDTO {
  targetDir: string
  fileName: string
  totalSize: number
  contentType?: string
  contentHash?: string
  chunkSize?: number
  clientUploadId: string
  fileHandle?: 0 | 1 | 2
}

export interface TransferChunkVO {
  transferId: string
  nextOffset: number
  receivedBytes: number
}

export interface CompleteUploadDTO {
  contentHash?: string
}

export interface CompleteUploadVO {
  path: string
  fileName: string
  length: number
  etag: string
  lastModified: number
}

export interface InitDownloadDTO {
  path: string
  clientDownloadId: string
}

export interface DownloadMetadataVO {
  transferId?: string
  path: string
  fileName: string
  totalSize: number
  etag: string
  lastModified: number
  acceptRanges: boolean
  chunkSize: number
}
