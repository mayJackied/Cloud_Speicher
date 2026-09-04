import { describe, expect, it } from 'vitest'
import {
  TRASH_META_NAME,
  isTrashMetaName,
  isUnderUserRoom,
  makeTrashStoredName,
  mergeTrashMeta,
  parseTrashMeta,
  parseTrashMetaText,
  resolveRestoreLocation,
  serverPathSegments,
  serializeTrashMeta,
} from './trashMeta'

describe('trashMeta', () => {
  it('解析并忽略坏条目', () => {
    expect(
      parseTrashMeta({
        'a.pdf': { from: '../files/8/docs', name: 'a.pdf' },
        bad: { from: 1 },
        [TRASH_META_NAME]: { from: '../files/8', name: 'x' },
      }),
    ).toEqual({
      'a.pdf': { from: '../files/8/docs', name: 'a.pdf' },
    })
  })

  it('文本往返', () => {
    const meta = { '头疼.GIF': { from: '../files/8/相册', name: '头疼.GIF' } }
    expect(parseTrashMetaText(serializeTrashMeta(meta))).toEqual(meta)
    expect(parseTrashMetaText('not-json')).toEqual({})
  })

  it('拆 server path', () => {
    expect(serverPathSegments('../files/8/docs')).toEqual(['8', 'docs'])
    expect(serverPathSegments('../files')).toEqual([])
    expect(serverPathSegments('/other')).toBeNull()
  })

  it('识别元数据文件名', () => {
    expect(isTrashMetaName(TRASH_META_NAME)).toBe(true)
    expect(isTrashMetaName('a.pdf')).toBe(false)
  })

  it('路径必须在用户房间下', () => {
    expect(isUnderUserRoom('../files/8/test', 8)).toBe(true)
    expect(isUnderUserRoom('../files/8', 8)).toBe(true)
    expect(isUnderUserRoom('../files/public', 8)).toBe(false)
    expect(isUnderUserRoom('../files/9/test', 8)).toBe(false)
  })

  it('local 覆盖 file 同名键', () => {
    expect(
      mergeTrashMeta(
        { a: { from: '../files/8', name: 'a' } },
        { a: { from: '../files/8/test', name: 'a' } },
      ).a.from,
    ).toBe('../files/8/test')
  })

  it('还原位置：有索引回原目录，子文件夹内标 nested', () => {
    const meta = { docs: { from: '../files/8', name: 'docs' } }
    expect(
      resolveRestoreLocation({
        crumbs: ['8', 'recycle_bin'],
        fileName: 'a.pdf',
        meta: { 'a.pdf': { from: '../files/8/888', name: 'a.pdf' } },
        userId: 8,
      }),
    ).toEqual({ targetDir: '../files/8/888', wantName: 'a.pdf', nested: false })
    expect(
      resolveRestoreLocation({
        crumbs: ['8', 'recycle_bin', 'docs'],
        fileName: 'a.pdf',
        meta,
        userId: 8,
      }).nested,
    ).toBe(true)
  })

  it('回收站落盘名保留扩展且唯一', () => {
    const a = makeTrashStoredName('ANI.EXE', 'abc123')
    const b = makeTrashStoredName('ANI.EXE', 'def456')
    expect(a).toBe('$Rabc123.EXE')
    expect(b).toBe('$Rdef456.EXE')
    expect(a).not.toBe(b)
    expect(makeTrashStoredName('docs', 'folder1')).toBe('$Rfolder1')
  })
})
