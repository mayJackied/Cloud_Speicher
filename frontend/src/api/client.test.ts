import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dropJsonContentType, isFormDataBody, setSessionKickHook } from './client'

describe('multipart 请求头', () => {
  it('认出 FormData', () => {
    expect(isFormDataBody(new FormData())).toBe(true)
    expect(isFormDataBody({ path: './files/8' })).toBe(false)
    expect(isFormDataBody('{"path":"x"}')).toBe(false)
  })

  it('清掉 application/json，避免 Spring 解析不到 parts', () => {
    const headers = new AxiosHeaders()
    headers.set('Content-Type', 'application/json; charset=UTF-8')
    dropJsonContentType(headers)
    expect(headers.get('Content-Type')).toBeFalsy()
  })
})

describe('会话失效钩子', () => {
  afterEach(() => {
    setSessionKickHook(null)
  })

  it('可注册并清空会话踢下线钩子', () => {
    const hook = vi.fn()
    setSessionKickHook(hook)
    setSessionKickHook(null)
    expect(hook).not.toHaveBeenCalled()
    setSessionKickHook(hook)
    expect(typeof hook).toBe('function')
  })
})
