import { describe, expect, it } from 'vitest'
import { isForbiddenMoveDest, isSameFolder } from './moveDest'

describe('move dest', () => {
  it('根目录不能作为目标', () => {
    expect(isForbiddenMoveDest([], ['2'], 'a.txt', true)).toBe(true)
  })

  it('不能移进自己或子目录', () => {
    expect(isForbiddenMoveDest(['2', 'docs'], ['2'], 'docs', false)).toBe(true)
    expect(isForbiddenMoveDest(['2', 'docs', 'old'], ['2'], 'docs', false)).toBe(true)
    expect(isForbiddenMoveDest(['2', 'other'], ['2'], 'docs', false)).toBe(false)
  })

  it('文件可以移到任意可写目录（只要不是根）', () => {
    expect(isForbiddenMoveDest(['2', 'docs'], ['2'], 'a.txt', true)).toBe(false)
  })

  it('同一目录判定', () => {
    expect(isSameFolder(['2', 'docs'], ['2', 'docs'])).toBe(true)
    expect(isSameFolder(['2'], ['2', 'docs'])).toBe(false)
  })
})
