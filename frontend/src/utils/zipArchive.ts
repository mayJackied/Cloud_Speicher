export interface ZipArchiveEntry {
  name: string
  data: Uint8Array
  modifiedAt?: number
}

/** 保持结果顺序的限流并发映射，避免文件夹下载一次打满连接。 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workerCount = Math.min(items.length, Math.max(1, Math.floor(limit)))

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await run(items[index] as T, index)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

const UTF8_FLAG = 0x0800
const STORE_METHOD = 0
const UINT32_MAX = 0xffffffff

function crcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let value = n
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[n] = value >>> 0
  }
  return table
}

const CRC_TABLE = crcTable()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(value?: number): { date: number; time: number } {
  const input = value && Number.isFinite(value) ? new Date(value) : new Date()
  const year = Math.max(1980, Math.min(2107, input.getFullYear()))
  return {
    date: ((year - 1980) << 9) | ((input.getMonth() + 1) << 5) | input.getDate(),
    time: (input.getHours() << 11) | (input.getMinutes() << 5) | (input.getSeconds() >> 1),
  }
}

function writer(size: number) {
  const bytes = new Uint8Array(size)
  const view = new DataView(bytes.buffer)
  let offset = 0
  return {
    bytes,
    u16(value: number) {
      view.setUint16(offset, value, true)
      offset += 2
    },
    u32(value: number) {
      view.setUint32(offset, value >>> 0, true)
      offset += 4
    },
  }
}

function normalizedName(name: string): string {
  return name.replace(/\\/g, '/').replace(/^\/+/, '')
}

/** 创建无压缩 ZIP。避免引入依赖，并兼容所有支持 Blob 的现代浏览器。 */
export function createZipArchive(entries: readonly ZipArchiveEntry[]): Blob {
  if (entries.length > 0xffff) {
    throw new Error('ZIP_ENTRY_LIMIT')
  }

  const encoder = new TextEncoder()
  const localParts: BlobPart[] = []
  const centralParts: BlobPart[] = []
  let localOffset = 0

  for (const entry of entries) {
    const name = encoder.encode(normalizedName(entry.name))
    const size = entry.data.byteLength
    if (size > UINT32_MAX || localOffset > UINT32_MAX) {
      throw new Error('ZIP_SIZE_LIMIT')
    }
    const checksum = crc32(entry.data)
    const stamp = dosTime(entry.modifiedAt)

    const local = writer(30)
    local.u32(0x04034b50)
    local.u16(20)
    local.u16(UTF8_FLAG)
    local.u16(STORE_METHOD)
    local.u16(stamp.time)
    local.u16(stamp.date)
    local.u32(checksum)
    local.u32(size)
    local.u32(size)
    local.u16(name.byteLength)
    local.u16(0)
    localParts.push(local.bytes, name, entry.data)

    const central = writer(46)
    central.u32(0x02014b50)
    central.u16(20)
    central.u16(20)
    central.u16(UTF8_FLAG)
    central.u16(STORE_METHOD)
    central.u16(stamp.time)
    central.u16(stamp.date)
    central.u32(checksum)
    central.u32(size)
    central.u32(size)
    central.u16(name.byteLength)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u32(entry.name.endsWith('/') ? 0x10 : 0)
    central.u32(localOffset)
    centralParts.push(central.bytes, name)

    localOffset += 30 + name.byteLength + size
  }

  const centralSize = centralParts.reduce((sum, part) => {
    if (part instanceof Uint8Array) {
      return sum + part.byteLength
    }
    return sum
  }, 0)
  if (localOffset + centralSize > UINT32_MAX) {
    throw new Error('ZIP_SIZE_LIMIT')
  }

  const end = writer(22)
  end.u32(0x06054b50)
  end.u16(0)
  end.u16(0)
  end.u16(entries.length)
  end.u16(entries.length)
  end.u32(centralSize)
  end.u32(localOffset)
  end.u16(0)

  return new Blob([...localParts, ...centralParts, end.bytes], { type: 'application/zip' })
}
