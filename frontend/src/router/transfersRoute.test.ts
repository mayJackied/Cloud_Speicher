import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lookupMessage } from '@/i18n/messages'

describe('传输列表路由和文案', () => {
  it('注册受保护的传输列表路由', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    expect(source).toContain("path: '/drive/transfers'")
    expect(source).toContain("name: 'drive-transfers'")
    expect(source).toContain('requiresAuth: true, hideChrome: true')
  })

  it('三种语言都有传输入口和等待后端状态', () => {
    for (const locale of ['zh-CN', 'en', 'de'] as const) {
      expect(lookupMessage(locale, 'drive.transfers')).not.toBe('drive.transfers')
      expect(lookupMessage(locale, 'transfers.statusWaitingBackend')).not.toBe(
        'transfers.statusWaitingBackend',
      )
    }
  })
})
