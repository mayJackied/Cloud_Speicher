import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatClockDate,
  formatMeridiem,
  formatUptime,
  formatUtcOffset,
  nextClockMode,
  padClock,
} from './timeboard'

describe('timeboard', () => {
  it('补零', () => {
    expect(padClock(3)).toBe('03')
    expect(padClock(42)).toBe('42')
  })

  it('本地 24h 带厘秒', () => {
    const d = new Date(2026, 8, 1, 2, 55, 38, 890)
    expect(formatClock(d, false, true, false)).toBe('02:55:38.89')
  })

  it('UTC 不含 12h 后缀', () => {
    const d = new Date(Date.UTC(2026, 8, 1, 0, 55, 38, 890))
    expect(formatClock(d, true, true, true)).toBe('00:55:38.89')
  })

  it('12h 本地只改小时，不把 AM/PM 拼进数字', () => {
    const d = new Date(2026, 8, 1, 14, 5, 9, 0)
    expect(formatClock(d, false, false, true)).toBe('02:05:09')
    expect(formatMeridiem(d, true)).toBe('PM')
    expect(formatMeridiem(d, false)).toBe('')
  })

  it('日期与 T+', () => {
    const d = new Date(2026, 8, 1, 2, 55, 38)
    expect(formatClockDate(d)).toBe('TUE 01 SEP 2026')
    expect(formatClockDate(d, 'zh-CN')).toBe('周二 01 9月 2026')
    expect(formatUptime(0, 135000)).toBe('T+ 00:02:15')
  })

  it('时区偏移与切模式', () => {
    const d = new Date()
    expect(formatUtcOffset(d)).toMatch(/^UTC[+-]\d{2}(?::\d{2})?$/)
    expect(nextClockMode(0)).toBe(1)
    expect(nextClockMode(2)).toBe(0)
  })
})
