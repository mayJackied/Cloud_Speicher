import { describe, expect, it } from 'vitest'
import { folderNameFromZip, isMacosxJunkName, uniqueExtractFolderName } from './extractTarget'

describe('解压目标文件夹名', () => {
  it('去掉 .zip 得到同名文件夹', () => {
    expect(folderNameFromZip('docs.zip')).toBe('docs')
    expect(folderNameFromZip('ARCHIVE.ZIP')).toBe('ARCHIVE')
  })

  it('同名已存在时加 (1)', () => {
    expect(uniqueExtractFolderName(['docs'], 'docs.zip')).toBe('docs(1)')
  })

  it('识别 __MACOSX 垃圾目录', () => {
    expect(isMacosxJunkName('__MACOSX')).toBe(true)
    expect(isMacosxJunkName('docs')).toBe(false)
  })
})
