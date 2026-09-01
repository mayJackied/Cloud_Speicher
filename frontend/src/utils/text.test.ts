import { describe, expect, it } from 'vitest'
import {
  archivalDisplayName,
  asciiUploadAlias,
  decodeFileName,
  filenameFromContentDisposition,
  isAsciiFileName,
  repairUtf8Mojibake,
} from './text'

describe('CJK / UTF-8 file names', () => {
  it('NFC 合并日文浊点', () => {
    const nfc = 'が'
    const nfd = nfc.normalize('NFD')
    expect(nfd).not.toBe(nfc)
    expect(decodeFileName(nfd)).toBe(nfc)
  })

  it('修回 UTF-8 被当成 Latin-1 的中文文件名', () => {
    const raw = String.fromCharCode(...new TextEncoder().encode('前端开发.md'))
    expect(repairUtf8Mojibake(raw)).toBe('前端开发.md')
    expect(archivalDisplayName(raw)).toBe('前端开发.MD')
  })

  it('修回 UTF-8 被当成 Windows-1252 的中文文件名', () => {
    expect(repairUtf8Mojibake('é£Ž')).toBe('风')
    expect(repairUtf8Mojibake('é£Žæ™¯.png')).toBe('风景.png')
    expect(decodeFileName('%E9%A3%8E%E6%99%AF.png')).toBe('风景.png')
    expect(archivalDisplayName('é£Žæ™¯.png')).toBe('风景.PNG')
  })

  it('已经是正常中文的文件名不再二次乱解', () => {
    expect(decodeFileName('风景.png')).toBe('风景.png')
    expect(archivalDisplayName('风景.png')).toBe('风景.PNG')
  })

  it('ASCII 临时上传名只保留安全扩展名', () => {
    expect(asciiUploadAlias('风景.png', 'abc')).toBe('uabc.png')
    expect(asciiUploadAlias('笔记.DOCX', 'x1')).toBe('ux1.DOCX')
    expect(isAsciiFileName('uabc.png')).toBe(true)
    expect(isAsciiFileName('风景.png')).toBe(false)
  })

  it('拉丁字母大写，CJK 保持原样', () => {
    expect(archivalDisplayName('notes 草稿.txt')).toBe('NOTES_草稿.TXT')
    expect(archivalDisplayName('写真.jpg')).toBe('写真.JPG')
  })

  it('解析 RFC 5987 filename*', () => {
    const header = "attachment; filename=\"mojibake.txt\"; filename*=UTF-8''%E6%B5%8B%E8%AF%95.txt"
    expect(filenameFromContentDisposition(header, 'x')).toBe('测试.txt')
  })
})
