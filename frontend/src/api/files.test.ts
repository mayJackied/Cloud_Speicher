import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import {
  addShareFileByShareLink,
  creatShareLink,
  deleteFiles,
  unzipFile,
  zipFile,
} from './files'

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

  it('生成分享码沿用后端 creatShareLink 路径', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)
    const dto = { shareFilePath: '../files/2/a.txt', expireDuration: 0 }

    void creatShareLink(dto)

    expect(post).toHaveBeenCalledWith('/file/creatShareLink', dto)
  })

  it('接收分享发送 JSON 字符串，而不是 link 对象', () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({} as never)

    void addShareFileByShareLink('share-key')

    expect(post).toHaveBeenCalledWith('/file/addShareFileByShareLink', 'share-key')
  })
})
