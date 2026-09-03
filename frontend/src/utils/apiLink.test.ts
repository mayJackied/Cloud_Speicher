import { describe, expect, it } from 'vitest'
import { linkStatusOf } from './apiLink'

describe('连接状态', () => {
  it('离线模式一律显示离线，不看探测结果', () => {
    expect(linkStatusOf('offline', 'unknown')).toBe('offline')
    expect(linkStatusOf('offline', 'up')).toBe('offline')
    expect(linkStatusOf('offline', 'down')).toBe('offline')
  })

  it('在线且最近一次请求打到后端', () => {
    expect(linkStatusOf('online', 'up')).toBe('online')
  })

  it('在线但代理/服务器不可达', () => {
    expect(linkStatusOf('online', 'down')).toBe('unreachable')
  })

  it('已切在线、还没有请求结果时是检测中', () => {
    expect(linkStatusOf('online', 'unknown')).toBe('checking')
  })
})
