import type { Locale } from '@/i18n/messages'

export type ClockMode = 0 | 1 | 2

export const CLOCK_MODE_LABELS = ['24H + MS', '24H', '12H LOCAL'] as const

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS_DE = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ']
const DAYS_DE = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA']
const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const DAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const DATE_PARTS: Record<Locale, { days: string[]; months: string[] }> = {
  'zh-CN': { days: DAYS_ZH, months: MONTHS_ZH },
  en: { days: DAYS_EN, months: MONTHS_EN },
  de: { days: DAYS_DE, months: MONTHS_DE },
}

export function padClock(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

export function formatClock(date: Date, utc: boolean, withMs: boolean, h12: boolean): string {
  let h = utc ? date.getUTCHours() : date.getHours()
  const m = utc ? date.getUTCMinutes() : date.getMinutes()
  const s = utc ? date.getUTCSeconds() : date.getSeconds()
  const ms = date.getMilliseconds()
  if (h12 && !utc) {
    h = h % 12 || 12
  }
  const core = `${padClock(h)}:${padClock(m)}:${padClock(s)}`
  return withMs ? `${core}.${padClock(Math.floor(ms / 10))}` : core
}

export function meridiemToken(date: Date, h12: boolean): 'am' | 'pm' | '' {
  if (!h12) {
    return ''
  }
  return date.getHours() >= 12 ? 'pm' : 'am'
}

export function formatMeridiem(date: Date, h12: boolean): string {
  const token = meridiemToken(date, h12)
  if (token === 'pm') {
    return 'PM'
  }
  if (token === 'am') {
    return 'AM'
  }
  return ''
}

export function formatClockDate(date: Date, locale: Locale = 'en'): string {
  const parts = DATE_PARTS[locale] ?? DATE_PARTS.en
  return `${parts.days[date.getDay()]} ${padClock(date.getDate())} ${parts.months[date.getMonth()]} ${date.getFullYear()}`
}

export function formatUtcOffset(date: Date): string {
  const offMin = -date.getTimezoneOffset()
  const sign = offMin >= 0 ? '+' : '-'
  const abs = Math.abs(offMin)
  const hours = padClock(Math.floor(abs / 60))
  return abs % 60 ? `UTC${sign}${hours}:${padClock(abs % 60)}` : `UTC${sign}${hours}`
}

export function formatUptime(startedAt: number, now: number): string {
  const up = Math.max(0, Math.floor((now - startedAt) / 1000))
  return `T+ ${padClock(Math.floor(up / 3600))}:${padClock(Math.floor((up % 3600) / 60))}:${padClock(up % 60)}`
}

export function resolveTimeZone(): string {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL').replace(/_/g, ' ')
  } catch {
    return 'LOCAL'
  }
}

export function nextClockMode(mode: ClockMode): ClockMode {
  return ((mode + 1) % 3) as ClockMode
}
