import { normalizeFileName } from '@/utils/text'

export interface FilesVO {
  filesVOS: FilesVO[] | null
  fileName: string
  length: number
  lastModified: number
  isFile: boolean
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

export interface RenameFileDTO {
  path: string
  newName: string
}

export interface DownloadFileDTO {
  path: string
}

/** JSON：`path` + `targetDir`（驼峰；空字符串 = 源文件父目录） */
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
  if (Array.isArray(row.filesVOS)) {
    filesVOS = []
    for (const child of row.filesVOS) {
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

export function childrenOf(node: FilesVO): FilesVO[] {
  return node.filesVOS ?? []
}
