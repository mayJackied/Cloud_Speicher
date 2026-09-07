import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addStarredCache,
  readStarredCache,
  remapStarredCache,
  remapStarredPaths,
  removeStarredCache,
  writeStarredCache,
} from './starredCache'

const values = new Map<string, string>()

beforeEach(() => {
  values.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})

describe('starredCache', () => {
  it('按用户保存并规范化去重', () => {
    writeStarredCache(2, ['../files/2/a.txt', '..\\files\\2\\a.txt'])
    expect(readStarredCache(2)).toEqual(['../files/2/a.txt'])
    expect(readStarredCache(3)).toEqual([])
  })

  it('加星和取消会持久更新', () => {
    addStarredCache(2, '../files/2/a.txt')
    addStarredCache(2, '../files/2/b.txt')
    removeStarredCache(2, '../files/2/a.txt')
    expect(readStarredCache(2)).toEqual(['../files/2/b.txt'])
  })

  it('重命名同步收藏路径，含目录前缀子项', () => {
    expect(
      remapStarredPaths(
        ['../files/2/a.txt', '../files/2/docs/b.txt', '../files/2/other.txt'],
        '../files/2/docs',
        '../files/2/notes',
      ),
    ).toEqual(['../files/2/a.txt', '../files/2/notes/b.txt', '../files/2/other.txt'])

    writeStarredCache(2, ['../files/2/pic.jpg'])
    expect(remapStarredCache(2, '../files/2/pic.jpg', '../files/2/微信图片.JPG')).toEqual([
      '../files/2/微信图片.JPG',
    ])
  })
})
