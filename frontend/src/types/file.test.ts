import { describe, expect, it } from 'vitest'
import { isLegalFileName, joinServerPath, readFilesVO, readFilesVOList, toServerPath, bytesOfNode } from './file'

describe('FilesVO / path', () => {
  it('is_file 映射成 isFile，并保留子树', () => {
    const vo = readFilesVO({
      fileName: 'public',
      length: 0,
      lastModified: 1,
      is_file: false,
      filesVOS: [{ fileName: 'a.txt', length: 3, lastModified: 2, is_file: true, filesVOS: null }],
    })
    expect(vo?.isFile).toBe(false)
    expect(vo?.filesVOS?.[0]).toMatchObject({ fileName: 'a.txt', isFile: true, length: 3 })
  })

  it('根列表是两棵树', () => {
    const list = readFilesVOList([
      { fileName: 'public', length: 0, lastModified: 0, is_file: false, filesVOS: null },
      { fileName: '9', length: 0, lastModified: 0, is_file: false, filesVOS: null },
    ])
    expect(list?.map((node) => node.fileName)).toEqual(['public', '9'])
  })

  it('缺少 fileName 不算 FilesVO', () => {
    expect(readFilesVO({ is_file: true, length: 1, lastModified: 0 })).toBeNull()
    expect(readFilesVOList([{ fileName: 'a' }])).toBeNull()
  })

  it('操作 path 拼 ../files + 面包屑', () => {
    expect(toServerPath(['public', 'document', 'a.txt'])).toBe('../files/public/document/a.txt')
    expect(toServerPath(['9'])).toBe('../files/9')
  })

  it('joinServerPath 给 rename/download 用，上传 path 仍是文件夹', () => {
    expect(joinServerPath('../files/8', 'pic.jpg')).toBe('../files/8/pic.jpg')
    expect(joinServerPath('../files/8/pic.jpg', 'pic.jpg')).toBe('../files/8/pic.jpg')
  })

  it('文件名规则', () => {
    expect(isLegalFileName('notes')).toBe(true)
    expect(isLegalFileName('前端开发.md')).toBe(true)
    expect(isLegalFileName('写真.jpg')).toBe(true)
    expect(isLegalFileName('')).toBe(false)
    expect(isLegalFileName('   ')).toBe(false)
    expect(isLegalFileName('a/b')).toBe(false)
    expect(isLegalFileName('..')).toBe(false)
  })

  it('乱码文件名原样保留，操作 path 仍对得上服务器', () => {
    const raw = 'é£Žæ™¯.png'
    const vo = readFilesVO({ fileName: raw, length: 1, lastModified: 0, is_file: true, filesVOS: null })
    expect(vo?.fileName).toBe(raw)
  })

  it('文件夹大小是子文件合计，不是把类型写进大小', () => {
    const vo = readFilesVO({
      fileName: 'TYPE',
      length: 0,
      lastModified: 1,
      is_file: false,
      filesVOS: [
        { fileName: 'a.txt', length: 1200, lastModified: 2, is_file: true, filesVOS: null },
        {
          fileName: 'nested',
          length: 0,
          lastModified: 3,
          is_file: false,
          filesVOS: [{ fileName: 'b.bin', length: 300, lastModified: 4, is_file: true, filesVOS: null }],
        },
      ],
    })
    expect(vo && bytesOfNode(vo)).toBe(1500)
    expect(bytesOfNode({ fileName: 'empty', length: 0, lastModified: 0, isFile: false, filesVOS: [] })).toBe(0)
  })
})
