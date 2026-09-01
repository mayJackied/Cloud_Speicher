/** 从 multipart 原始字节里抽出 name="file" 的文件体（latin1 无损）。 */

export function extractMultipartFile(bytes: Uint8Array, field = 'file'): Uint8Array | null {
  const text = new TextDecoder('latin1').decode(bytes)
  const marker = `name="${field}"`
  const hit = text.indexOf(marker)
  if (hit < 0) {
    return null
  }
  const headerEnd = text.indexOf('\r\n\r\n', hit)
  if (headerEnd < 0) {
    return null
  }
  const start = headerEnd + 4
  const end = text.indexOf('\r\n--', start)
  if (end < 0 || end <= start) {
    return null
  }
  return bytes.subarray(start, end)
}

export function looksLikeMultipart(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x2d && bytes[1] === 0x2d
}

export function fileBytesFromStored(bytes: Uint8Array): Uint8Array {
  if (!looksLikeMultipart(bytes)) {
    return bytes
  }
  return extractMultipartFile(bytes) ?? bytes
}
