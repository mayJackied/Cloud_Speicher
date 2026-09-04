import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { deleteFiles, unzipFile, zipFile } from './files'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('删除与压缩请求', () => {
  it('批量删除发送 DeleteFileDTO 数组到 deleteFiles', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    const dtos = [{ path: '../files/2/a.txt' }, { path: '../files/2/b.txt' }]

    void deleteFiles(dtos)

    expect(post).toHaveBeenCalledWith('/file/deleteFiles', dtos)
  })

  it('压缩发送 path 与目标目录', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    const dto = { path: '../files/2/a.txt', targetDir: '../files/2' }

    void zipFile(dto)

    expect(post).toHaveBeenCalledWith('/file/zip', dto)
  })

  it('解压发送 ZIP 路径和目标同名文件夹路径', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    const dto = { path: '../files/2/archive.zip', targetDir: '../files/2/archive' }

    void unzipFile(dto)

    expect(post).toHaveBeenCalledWith('/file/unzip', dto)
  })
})
