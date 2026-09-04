import { AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { dropJsonContentType, isFormDataBody } from './client'

describe('multipart 请求头', () => {
  it('认出 FormData', () => {
    expect(isFormDataBody(new FormData())).toBe(true)
    expect(isFormDataBody({ path: '../files/8' })).toBe(false)
    expect(isFormDataBody('{"path":"x"}')).toBe(false)
  })

  it('清掉 application/json，避免 Spring 解析不到 parts', () => {
    const headers = new AxiosHeaders()
    headers.set('Content-Type', 'application/json; charset=UTF-8')
    dropJsonContentType(headers)
    expect(headers.get('Content-Type')).toBeFalsy()
  })
})
