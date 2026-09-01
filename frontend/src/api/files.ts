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
import { asUtf8UploadFile } from '@/utils/text'

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
  const utf8File = asUtf8UploadFile(file)
  const body = new FormData()
  body.append('path', path)
  body.append('fileName', utf8File.name)
  body.append('file', utf8File, utf8File.name)
  return api.post<Result<null>>('/file/uploadFile', body, {
    timeout: 0,
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
  return api.post<Result<null>>('/file/moveFile', {
    path: dto.path,
    targetDir: dto.targetDir,
    fileHandle: dto.fileHandle,
  })
}
