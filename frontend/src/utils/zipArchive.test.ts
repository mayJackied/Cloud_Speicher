import { describe, expect, it } from 'vitest'
import { createZipArchive, crc32, mapWithConcurrency } from './zipArchive'

describe('zipArchive', () => {
  it('计算标准 CRC32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('写出带 UTF-8 文件名的 ZIP 结构', async () => {
    const blob = createZipArchive([
      { name: '资料/', data: new Uint8Array() },
      { name: '资料/说明.txt', data: new TextEncoder().encode('hello') },
    ])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const view = new DataView(bytes.buffer)
    const text = new TextDecoder().decode(bytes)

    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
    expect(text).toContain('资料/说明.txt')
    expect(blob.type).toBe('application/zip')
  })

  it('并发映射限制活跃任务并保持结果顺序', async () => {
    let active = 0
    let peak = 0
    const result = await mapWithConcurrency([30, 5, 20, 10], 2, async (delay, index) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, delay))
      active -= 1
      return `item-${index}`
    })

    expect(peak).toBe(2)
    expect(result).toEqual(['item-0', 'item-1', 'item-2', 'item-3'])
  })
})
