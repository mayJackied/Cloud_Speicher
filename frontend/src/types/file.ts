import { normalizeFileName } from '@/utils/text'

export interface FilesVO {
  filesVOS: FilesVO[] | null
  fileName: string
  length: number
  lastModified: number
  isFile: boolean
}

/** 后端 `FileVOS`：普通根目录与别人分享给当前用户的文件分开返回。 */
export interface FileCatalogVO {
  fileListVOS: FilesVO[]
  sharedFileVOS: SharedFileVO[]
}

export interface SharedFileVO {
  fileListVO: FilesVO
  sharerId: number
  sharedFilePath: string
}

/** 对应 Java `FileDTO`（原 AddFileDTO）。JSON：`is_file` + `path` */
export interface FileDTO {
  isFile: boolean
  path: string
}

/** @deprecated 用 FileDTO；保留别名以免旧 import 断掉 */
export type AddFileDTO = FileDTO

export interface DeleteFileDTO {
  path: string
}

/** 批量删除：`POST /file/deleteFiles`，body 为 DeleteFileDTO 数组。 */
export type DeleteFilesDTO = DeleteFileDTO[]

export interface RenameFileDTO {
  path: string
  newName: string
}

export interface DownloadFileDTO {
  /** @deprecated 旧整包下载字段；现网改为 ContinuableDownloadDTO.downloadFilePath */
  path?: string
}

/** 现网 `POST /file/downloadFile`：首次或从 downloadedSize 续传剩余字节。 */
export const DownloadType = {
  FIRST: 0,
  RESUME: 1,
} as const

export type DownloadTypeValue = (typeof DownloadType)[keyof typeof DownloadType]

export interface ContinuableDownloadDTO {
  downloadFilePath: string
  downloadedSize?: number | null
  downloadType: DownloadTypeValue
}

export interface ContinuableUploadDTO {
  uploadKey: string
  targetPath: string
  file: File | Blob
  fileName?: string
  uploadType: 0 | 1
}

export interface CloseUploadDTO {
  uploadKey: string
}

export interface GetUploadedSizeDTO {
  uploadKey: string
}

export interface StarFileDTO {
  starFilePath: string
}

export interface StarredFileVO {
  starFilePath: string
}

export interface CreatShareLinkDTO {
  shareFilePath: string
  /** 小时；0 表示使用后端默认保留时长。 */
  expireDuration: number
}

export interface CreatShareLinkVO {
  shareKey: string
}

/** JSON：path + 	argetDir（驼峰；空字符串 = 源文件父目录） */
export interface ZipFileDTO {
  path: string
  targetDir: string
}

/** 同名冲突：0 不处理并返回 20006；1 替换；2 忽略（前端一般不发） */
export const FileHandle = {
  DEFAULT: 0,
  REPLACE: 1,
  IGNORE: 2,
} as const

export type FileHandleValue = (typeof FileHandle)[keyof typeof FileHandle]

export interface MoveFileDTO {
  path: string
  targetDir: string
  fileHandle: FileHandleValue
}

export function isLegalFileName(name: string): boolean {
  return Boolean(
    name &&
      name.trim() === name &&
      name !== '.' &&
      name !== '..' &&
      !name.includes('/') &&
      !name.includes('\\') &&
      !/[\u0000-\u001f]/.test(name),
  )
}

/** 后端 `my.val.file.path`，getFiles 只回 fileName，操作接口要拼这个前缀。 */
export const FILE_STORAGE_PREFIX = '../files'

export function toServerPath(segments: readonly string[]): string {
  return [FILE_STORAGE_PREFIX, ...segments].join('/')
}

/** 目录 + 文件名。已带同一文件名则不重复拼。 */
export function joinServerPath(dir: string, name: string): string {
  const base = dir.replace(/[\\/]+$/, '').replace(/\\/g, '/')
  if (!name) {
    return base
  }
  if (base === name || base.endsWith(`/${name}`)) {
    return base
  }
  return `${base}/${name}`
}

function asRecord(data: unknown): Record<string, unknown> | null {
  return data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : null
}

export function readFilesVO(data: unknown): FilesVO | null {
  const row = asRecord(data)
  if (!row) {
    return null
  }
  if (typeof row.fileName !== 'string') {
    return null
  }
  const isFile = row.isFile ?? row.is_file ?? row.file
  if (typeof isFile !== 'boolean') {
    return null
  }
  const length = typeof row.length === 'number' && Number.isFinite(row.length) ? row.length : 0
  const lastModified =
    typeof row.lastModified === 'number' && Number.isFinite(row.lastModified) ? row.lastModified : 0
  let filesVOS: FilesVO[] | null = null
  const rawChildren = row.fileListVOS ?? row.filesVOS
  if (Array.isArray(rawChildren)) {
    filesVOS = []
    for (const child of rawChildren) {
      const vo = readFilesVO(child)
      if (!vo) {
        return null
      }
      filesVOS.push(vo)
    }
  }
  return { filesVOS, fileName: normalizeFileName(row.fileName), length, lastModified, isFile }
}

export function readFilesVOList(data: unknown): FilesVO[] | null {
  if (!Array.isArray(data)) {
    return null
  }
  const list: FilesVO[] = []
  for (const item of data) {
    const vo = readFilesVO(item)
    if (!vo) {
      return null
    }
    list.push(vo)
  }
  return list
}

/**
 * 解析 backend `075193e` 的 getFiles 返回值。
 * 暂时兼容旧数组响应，便于前后端滚动部署。
 */
export function readFileCatalogVO(data: unknown): FileCatalogVO | null {
  const legacyRoots = readFilesVOList(data)
  if (legacyRoots) {
    return { fileListVOS: legacyRoots, sharedFileVOS: [] }
  }

  const row = asRecord(data)
  if (!row) {
    return null
  }
  const fileListVOS = readFilesVOList(row.fileListVOS)
  if (!fileListVOS) {
    return null
  }

  const sharedFileVOS: SharedFileVO[] = []
  const rawShared = row.sharedFileVOS
  if (rawShared != null && !Array.isArray(rawShared)) {
    return null
  }
  for (const value of rawShared ?? []) {
    const shared = asRecord(value)
    const fileListVO = readFilesVO(shared?.fileListVO)
    const sharerId = shared?.sharerId
    const sharedFilePath = shared?.sharedFilePath
    if (
      !fileListVO ||
      typeof sharerId !== 'number' ||
      !Number.isFinite(sharerId) ||
      typeof sharedFilePath !== 'string'
    ) {
      return null
    }
    sharedFileVOS.push({ fileListVO, sharerId, sharedFilePath })
  }
  return { fileListVOS, sharedFileVOS }
}

export function childrenOf(node: FilesVO): FilesVO[] {
  return node.filesVOS ?? []
}

/** 文件用 length；文件夹把当前树里已经拿到的子文件加总。 */
export function bytesOfNode(node: FilesVO): number {
  if (node.isFile) {
    return node.length || 0
  }
  let total = 0
  for (const child of childrenOf(node)) {
    total += bytesOfNode(child)
  }
  return total
}

