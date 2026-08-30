import { api } from './client'
import type {
  DeleteFileDTO,
  DownloadFileDTO,
  FileDTO,
  FilesVO,
  MoveFileDTO,
  RenameFileDTO,
  ZipFileDTO,
} from '@/types/file'
import type { Result } from '@/types/result'

export function getFiles() {
  return api.get<Result<FilesVO[]>>('/file/getFiles')
}

export function addFile(dto: FileDTO) {
  return api.post<Result<null>>('/file/addFile', { is_file: dto.isFile, path: dto.path })
}

export function deleteFile(dto: DeleteFileDTO) {
  return api.post<Result<null>>('/file/deleteFile', dto)
}

export function renameFile(dto: RenameFileDTO) {
  return api.post<Result<null>>('/file/renameFile', { path: dto.path, new_name: dto.newName })
}

export function uploadFile(path: string, file: File) {
  const body = new FormData()
  body.append('path', path)
  body.append('file', file)
  return api.post<Result<null>>('/file/uploadFile', body, {
    timeout: 0,
    // 表单字段绑不上时，Spring @ModelAttribute 还能从 query 拿到 path
    params: { path },
  })
}

export function downloadFile(dto: DownloadFileDTO) {
  return api.post('/file/downloadFile', dto, { responseType: 'blob', timeout: 0 })
}

export function zipFile(dto: ZipFileDTO) {
  return api.post<Result<null>>('/file/zip', dto)
}

export function unzipFile(dto: ZipFileDTO) {
  return api.post<Result<null>>('/file/unzip', dto)
}

export function moveFile(dto: MoveFileDTO) {
  return api.post<Result<null>>('/file/moveFile', dto)
}
