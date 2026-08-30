import { api } from './client'
import type { AddFileDTO, DeleteFileDTO, DownloadFileDTO, FilesVO, RenameFileDTO } from '@/types/file'
import type { Result } from '@/types/result'

export function getFiles() {
  return api.get<Result<FilesVO[]>>('/file/getFiles')
}

export function addFile(dto: AddFileDTO) {
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
  return api.post<Result<null>>('/file/uploadFile', body)
}

export function downloadFile(dto: DownloadFileDTO) {
  return api.post('/file/downloadFile', dto, { responseType: 'blob' })
}
