import { describe, expect, it } from 'vitest'
import {
  RECYCLE_BIN_NAME,
  findRecycleBin,
  isInTrash,
  isProtectedRecycleBin,
  isRecycleBinName,
  trashItemCount,
} from './recycleBin'

describe('recycleBin', () => {
  it('识别文件夹名', () => {
    expect(isRecycleBinName('recycle_bin')).toBe(true)
    expect(isRecycleBinName('RECYCLE_BIN')).toBe(true)
    expect(isRecycleBinName('trash')).toBe(false)
  })

  it('crumbs 判定是否在回收站', () => {
    expect(isInTrash(['8', 'recycle_bin'], 8)).toBe(true)
    expect(isInTrash(['8', 'recycle_bin', 'old'], 8)).toBe(true)
    expect(isInTrash(['8', 'docs'], 8)).toBe(false)
    expect(isInTrash(['public'], 8)).toBe(false)
  })

  it('只保护房间根下的回收站文件夹', () => {
    const bin = { fileName: 'recycle_bin', isFile: false }
    expect(isProtectedRecycleBin(['8'], bin, 8)).toBe(true)
    expect(isProtectedRecycleBin(['8', 'recycle_bin'], bin, 8)).toBe(false)
    expect(isProtectedRecycleBin(['8'], { fileName: 'docs', isFile: false }, 8)).toBe(false)
    expect(isProtectedRecycleBin(['8'], { fileName: 'recycle_bin', isFile: true }, 8)).toBe(false)
  })

  it('统计回收站条目（不计元数据）', () => {
    const room = {
      fileName: '8',
      isFile: false,
      length: 0,
      lastModified: 0,
      filesVOS: [
        {
          fileName: RECYCLE_BIN_NAME,
          isFile: false,
          length: 0,
          lastModified: 0,
          filesVOS: [
            { fileName: 'a.pdf', isFile: true, length: 1, lastModified: 0, filesVOS: null },
            { fileName: '_trash_meta.json', isFile: true, length: 1, lastModified: 0, filesVOS: null },
          ],
        },
      ],
    }
    expect(findRecycleBin(room)?.fileName).toBe(RECYCLE_BIN_NAME)
    expect(trashItemCount(room)).toBe(1)
    expect(trashItemCount({ fileName: '8', isFile: false, length: 0, lastModified: 0, filesVOS: null })).toBe(0)
  })
})
