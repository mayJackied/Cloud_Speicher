import { describe, expect, it } from 'vitest'
import { canDownloadInFolder, canWriteInFolder } from './driveAccess'

describe('网盘权限', () => {
  const user = { userId: 2, isAdmin: false }
  const admin = { userId: 1, isAdmin: true }

  it('根目录不能写也不能下', () => {
    expect(canWriteInFolder({ crumbs: [], ...user })).toBe(false)
    expect(canDownloadInFolder({ crumbs: [], ...user })).toBe(false)
  })

  it('普通用户在自己的房间可写可下', () => {
    expect(canWriteInFolder({ crumbs: ['2'], ...user })).toBe(true)
    expect(canDownloadInFolder({ crumbs: ['2', 'notes'], ...user })).toBe(true)
  })

  it('普通用户在公共空间只能下、不能写', () => {
    expect(canWriteInFolder({ crumbs: ['public'], ...user })).toBe(false)
    expect(canDownloadInFolder({ crumbs: ['public', 'document'], ...user })).toBe(true)
  })

  it('管理员在公共空间可写可下', () => {
    expect(canWriteInFolder({ crumbs: ['public'], ...admin })).toBe(true)
    expect(canDownloadInFolder({ crumbs: ['public'], ...admin })).toBe(true)
  })

  it('不能改别人的房间', () => {
    expect(canWriteInFolder({ crumbs: ['9'], ...user })).toBe(false)
    expect(canDownloadInFolder({ crumbs: ['9'], ...user })).toBe(false)
  })
})
