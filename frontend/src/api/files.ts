import { api, postForm } from './client'
import type {
  CloseUploadDTO,
  ContinuableDownloadDTO,
  ContinuableUploadDTO,
  DeleteFileDTO,
  FileDTO,
  FilesVO,
  MoveFileDTO,
  RenameFileDTO,
  StarFileDTO,
  StarredFileVO,
  ZipFileDTO,
} from '@/types/file'
import { DownloadType } from '@/types/file'
import type { Result } from '@/types/result'
import { asUtf8UploadFile } from '@/utils/text'
import { isResultShape } from '@/dev/contract'
import { ErrorCode } from '@/types/errorCode'

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

export function initUpload() {
  return api.get<Result<string>>('/file/initUpload')
}

export function continuableUploadFile(dto: ContinuableUploadDTO) {
  const body = new FormData()
  body.append('uploadKey', dto.uploadKey)
  body.append('targetPath', dto.targetPath)
  const name = dto.fileName || (dto.file instanceof File ? dto.file.name : 'blob.bin')
  body.append('multipartFile', dto.file, name)
  body.append('uploadType', String(dto.uploadType))
  return postForm<Result<null>>('/file/continuableUploadFile', body)
}

export function getUploadedSize(dto: { uploadKey: string }) {
  return api.get<Result<number>>('/file/getUploadedSize', { params: dto })
}

export function closeUpload(dto: CloseUploadDTO) {
  return api.post<Result<null>>('/file/closeUpload', dto)
}

/** 兼容旧整包上传调用：init → 一次 continuable → close。 */
export async function uploadFile(dir: string, file: File) {
  const utf8File = asUtf8UploadFile(file)
  const init = await initUpload()
  if (!isResultShape(init.data) || init.data.code !== ErrorCode.OK || !init.data.data) {
    return init
  }
  const uploadKey = String(init.data.data)
  try {
    const uploaded = await continuableUploadFile({
      uploadKey,
      targetPath: dir,
      file: utf8File,
      fileName: utf8File.name,
      uploadType: 0,
    })
    await closeUpload({ uploadKey })
    return uploaded
  } catch (error) {
    try {
      await closeUpload({ uploadKey })
    } catch {
      /* ignore cleanup failure */
    }
    throw error
  }
}

export function downloadFile(dto: ContinuableDownloadDTO | { path: string }) {
  const body: ContinuableDownloadDTO =
    'downloadFilePath' in dto
      ? {
          downloadFilePath: dto.downloadFilePath,
          downloadedSize: dto.downloadedSize ?? 0,
          downloadType: dto.downloadType,
        }
      : {
          downloadFilePath: dto.path,
          downloadedSize: 0,
          downloadType: DownloadType.FIRST,
        }
  return api.post('/file/downloadFile', body, { responseType: 'blob', timeout: 0 })
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

export function addStarFile(dto: StarFileDTO) {
  return api.post<Result<null>>('/file/addStarFile', dto)
}

export function deleteStarredFile(dto: StarFileDTO) {
  return api.post<Result<null>>('/file/deleteStarredFile', dto)
}

export function getStarredFiles() {
  return api.post<Result<StarredFileVO[]>>('/file/getStarredFiles')
}
