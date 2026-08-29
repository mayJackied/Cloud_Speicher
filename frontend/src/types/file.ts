/** 文件树节点。Java JSON：fileName / length / lastModified / filesVOS / is_file */

export interface FilesVO {
  files: FilesVO[] | null
  fileName: string
  length: number
  lastModified: number
  isFile: boolean
}

export interface AddFileDTO {
  isFile: boolean
  path: string
}

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

export function isLegalFileName(name: string): boolean {
  return Boolean(
    name &&
      name.trim() === name &&
      name !== '.' &&
      name !== '..' &&
      !name.includes('/') &&
      !name.includes('\\'),
  )
}
