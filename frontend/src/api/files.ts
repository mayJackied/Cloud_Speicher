import { api, postForm } from './client'
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

export function deleteFiles(dtos: DeleteFileDTO[]) {
  return api.post<Result<null>>('/file/deleteFiles', dtos)
}

export function renameFile(dto: RenameFileDTO) {
  return api.post<Result<null>>('/file/renameFile', { path: dto.path, new_name: dto.newName })
}

export function uploadFile(dir: string, file: File) {
  const utf8File = asUtf8UploadFile(file)
  const body = new FormData()
  // path = 已存在的目标文件夹；文件名只取 multipart file part 的 filename。
  body.append('path', dir)
  body.append('file', utf8File, utf8File.name)
  return postForm<Result<null>>('/file/uploadFile', body)
}

export function downloadFile(dto: DownloadFileDTO) {
  return api.post('/file/downloadFile', dto, { responseType: 'blob', timeout: 60000 })
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
