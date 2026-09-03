import { describe, expect, it } from 'vitest'
import { ASCII_NUT, ASCII_WAVE, asciiOf } from './concreteAscii'

describe('Concrete ASCII', () => {
  it('螺母和波形都是多行字符图', () => {
    expect(ASCII_NUT.split('\n').length).toBeGreaterThan(5)
    expect(ASCII_WAVE.split('\n').length).toBeGreaterThan(4)
    expect(ASCII_NUT).toMatch(/[=|o]/)
    expect(ASCII_WAVE).toMatch(/[\\/-]/)
  })

  it('按空目录 / 搜索挑选图形', () => {
    expect(asciiOf('empty')).toBe(ASCII_NUT)
    expect(asciiOf('search')).toBe(ASCII_WAVE)
  })
})
