/** Unicode NFC + UTF-8 文件名：中日韩默认按字符存储/显示，不强制拉丁大写。 */

export function normalizeFileName(name: string): string {
  return name.normalize('NFC')
}

/** Windows-1252 里 0x80–0x9F 对应的 Unicode → 原始字节。 */
const CP1252_BYTE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
}

function cjkScore(value: string): number {
  let score = 0
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    if (
      (code >= 0x3400 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      score += 3
    } else if (code === 0xfffd) {
      score -= 6
    } else if (code >= 0x80 && code < 0x100) {
      score -= 1
    }
  }
  return score
}

function legacyBytesFromString(value: string): Uint8Array | null {
  const out: number[] = []
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0xff) {
      out.push(code)
      continue
    }
    const mapped = CP1252_BYTE[code]
    if (mapped === undefined) {
      return null
    }
    out.push(mapped)
  }
  return Uint8Array.from(out)
}

function utf8FromLegacy(value: string): string | null {
  const bytes = legacyBytesFromString(value)
  if (!bytes || bytes.length === 0) {
    return null
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function percentDecode(value: string): string {
  if (!/%[0-9A-Fa-f]{2}/.test(value)) {
    return value
  }
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function pickBetterName(...candidates: string[]): string {
  let best = candidates[0] ?? ''
  let bestScore = cjkScore(best)
  for (const item of candidates.slice(1)) {
    const score = cjkScore(item)
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return best
}

/** 把「UTF-8 字节被当成 Latin-1 / Windows-1252」的乱码修回来。 */
export function repairUtf8Mojibake(value: string): string {
  const once = utf8FromLegacy(value)
  if (!once) {
    return value
  }
  const twice = utf8FromLegacy(once) ?? once
  return pickBetterName(value, once, twice)
}

export function decodeFileName(value: string): string {
  const percent = percentDecode(value)
  return normalizeFileName(pickBetterName(value, percent, repairUtf8Mojibake(percent)))
}

export function asUtf8UploadFile(file: File): File {
  const name = decodeFileName(file.name)
  if (name === file.name) {
    return file
  }
  return new File([file], name, { type: file.type, lastModified: file.lastModified })
}

export function isAsciiFileName(name: string): boolean {
  return /^[\x20-\x7e]+$/.test(name)
}

/** 给会走 ISO-8859-1 文件名头的后端用的 ASCII 临时名，上传后再 JSON rename。 */
export function asciiUploadAlias(original: string, nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`): string {
  const base = original.normalize('NFC')
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) : ''
  const safe = `u${nonce.replace(/[^A-Za-z0-9]/g, '')}`
  return ext ? `${safe}.${ext}` : safe
}

/** 与现网上传重名规则一致：`a.xlsx` → `a(1).xlsx`，`头疼.GIF` → `头疼(1).GIF`。 */
export function availableCopyName(taken: Iterable<string>, name: string): string {
  const have = new Set(taken)
  if (!have.has(name)) {
    return name
  }
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 1; i < 10000; i += 1) {
    const candidate = `${stem}(${i})${ext}`
    if (!have.has(candidate)) {
      return candidate
    }
  }
  return name
}

/** 档案风：只把拉丁字母变大写，CJK / 假名 / 谚文保持原字形。 */
export function archivalDisplayName(name: string): string {
  return decodeFileName(name)
    .replace(/\s+/g, '_')
    .replace(/[A-Za-z]+/g, (chunk) => chunk.toUpperCase())
}

export function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) {
    return decodeFileName(fallback)
  }
  const starred = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header)
  if (starred?.[1]) {
    try {
      return decodeFileName(decodeURIComponent(starred[1].trim().replace(/^"(.*)"$/, '$1')))
    } catch {
      /* fall through */
    }
  }
  const quoted = /filename="([^"]*)"/i.exec(header)
  if (quoted?.[1]) {
    return decodeFileName(quoted[1])
  }
  const plain = /filename=([^;]+)/i.exec(header)
  if (plain?.[1]) {
    return decodeFileName(plain[1].trim().replace(/^"(.*)"$/, '$1'))
  }
  return decodeFileName(fallback)
}
