import { describe, expect, it } from 'vitest'
import { GLYPH_STYLES, charForInk, glyphFromRgba, pickGlyphStyle } from './rasterizeGlyph'

describe('图片转字符', () => {
  it('透明是空格；实心黑取当前灰度表最密的字', () => {
    expect(charForInk(0, 0, GLYPH_STYLES.block)).toBe(' ')
    expect(charForInk(1, 1, GLYPH_STYLES.block)).toBe(' ')
    expect(charForInk(1, 0, GLYPH_STYLES.block)).toBe('█')
    expect(charForInk(1, 0, GLYPH_STYLES.geek)).toBe('%')
    expect(charForInk(1, 0, GLYPH_STYLES.dots)).toBe('@')
  })

  it('按像素采样成点阵', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 128, 255, 255, 255, 255,
    ])
    const glyph = glyphFromRgba(data, 2, 2, GLYPH_STYLES.dots)
    const rows = glyph.split('\n')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.[0]).toBe('@')
    expect(rows[0]?.[1]).toBe(' ')
    expect(rows[1]?.[0]).not.toBe(' ')
    expect(rows[1]?.[1]).toBe(' ')
  })

  it('三种风格都能抽到', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i += 1) {
      seen.add(pickGlyphStyle(() => i / 40))
    }
    expect(seen.has('block')).toBe(true)
    expect(seen.has('geek')).toBe(true)
    expect(seen.has('dots')).toBe(true)
  })
})
