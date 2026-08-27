import { describe, expect, it } from 'vitest'
import {
  describeRegisterResponse,
  extraPayloadKeys,
  isProxyFailureBody,
  isRegisterResult,
  missingPayloadKeys,
} from './registerContract'

describe('register 契约', () => {
  it('完整 DTO 没有缺字段或多字段', () => {
    const dto = { name: 'a', password: 'b', inviteCode: 'c' }
    expect(missingPayloadKeys(dto)).toEqual([])
    expect(extraPayloadKeys(dto)).toEqual([])
  })

  it('invite_code 算多出来的错误字段', () => {
    expect(extraPayloadKeys({ name: 'a', password: 'b', invite_code: 'c' })).toEqual([
      'invite_code',
    ])
  })

  it('返回值只接受 boolean', () => {
    expect(isRegisterResult(true)).toBe(true)
    expect(isRegisterResult(false)).toBe(true)
    expect(isRegisterResult({ success: true })).toBe(false)
    expect(isRegisterResult('true')).toBe(false)
  })

  it('Vite 代理失败不算返回值契约错误', () => {
    const body = 'http proxy error: /api/user/register\nAggregateError [ECONNREFUSED]'
    expect(isProxyFailureBody(body)).toBe(true)
    expect(describeRegisterResponse(body)).toMatch(/还不能验返回契约/)
  })
})

