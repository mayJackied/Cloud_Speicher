import { describe, expect, it } from 'vitest'
import { extractMultipartFile, fileBytesFromStored } from './multipart'

describe('multipart file extract', () => {
  it('抽出 name=file 的二进制体', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
    const body = new TextEncoder().encode(
      '------bound\r\nContent-Disposition: form-data; name="path"\r\n\r\n../files/2\r\n------bound\r\nContent-Disposition: form-data; name="file"; filename="a.jpg"\r\nContent-Type: image/jpeg\r\n\r\n',
    )
    const tail = new TextEncoder().encode('\r\n------bound--\r\n')
    const raw = new Uint8Array(body.length + jpeg.length + tail.length)
    raw.set(body, 0)
    raw.set(jpeg, body.length)
    raw.set(tail, body.length + jpeg.length)
    expect(Array.from(extractMultipartFile(raw) ?? [])).toEqual(Array.from(jpeg))
    expect(Array.from(fileBytesFromStored(raw))).toEqual(Array.from(jpeg))
  })

  it('非 multipart 原样返回', () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff])
    expect(fileBytesFromStored(jpeg)).toEqual(jpeg)
  })
})
