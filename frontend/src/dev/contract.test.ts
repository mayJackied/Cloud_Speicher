import { describe, expect, it } from 'vitest'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import {
  describeResult,
  describeTransportError,
  extraRegisterKeys,
  fixtureFail,
  fixtureSuccessLogin,
  isProxyFailureBody,
  isResultShape,
  missingRegisterKeys,
  readLoginVO,
} from './contract'

describe('Result / DTO 契约', () => {
  it('RegisterDTO 三字段驼峰', () => {
    const dto = { name: 'a', password: 'b', inviteCode: 'c' }
    expect(missingRegisterKeys(dto)).toEqual([])
    expect(extraRegisterKeys(dto)).toEqual([])
  })

  it('invite_code 算多余字段', () => {
    expect(extraRegisterKeys({ name: 'a', password: 'b', invite_code: 'c' })).toEqual([
      'invite_code',
    ])
  })

  it('成功 Result 含 LoginVO', () => {
    const body = fixtureSuccessLogin()
    expect(isResultShape(body)).toBe(true)
    expect(readLoginVO(body.data)?.name).toBe('alice')
    expect(readLoginVO(body.data)?.token).toBe('mock-token')
    expect(describeResult(body)).toMatch(/LoginVO/)
  })

  it('LoginVO 兼容 is_admin 与 user_id', () => {
    const vo = readLoginVO({ token: 't', user_id: 3, name: 'bob', is_admin: true })
    expect(vo).toEqual({ token: 't', userId: 3, name: 'bob', isAdmin: true })
  })

  it('失败 Result 用整数错误码、没有 msg', () => {
    const body = fixtureFail(ErrorCode.USERNAME_OR_PASSWORD_INVALID)
    expect(isResultShape(body)).toBe(true)
    expect(body).not.toHaveProperty('msg')
    expect(describeResult(body)).toMatch(/用户名或密码不正确/)
  })

  it('旧 boolean 返回不算 Result', () => {
    expect(isResultShape(true)).toBe(false)
    expect(describeResult(true)).toMatch(/形状错误/)
  })

  it('代理失败不算 VO 形状错误', () => {
    const body = 'http proxy error: /api/user/register\nAggregateError [ECONNREFUSED]'
    expect(isProxyFailureBody(body)).toBe(true)
    expect(describeResult(body)).toMatch(/在线未连通/)
  })

  it('错误码对照表覆盖登录失败', () => {
    expect(messageForCode(ErrorCode.USERNAME_OR_PASSWORD_INVALID)).toBe('用户名或密码不正确')
    expect(fixtureFail(ErrorCode.USERNAME_OR_PASSWORD_INVALID).code).toBe(10011)
  })

  it('缺少 token 不算 LoginVO', () => {
    expect(readLoginVO({ userId: 1, name: 'alice', isAdmin: false })).toBeNull()
    expect(describeResult({ code: 1, data: { userId: 1, name: 'alice', isAdmin: false } })).toMatch(
      /不是 LoginVO/,
    )
  })

  it('HTTP 500 不算未连通', () => {
    expect(describeTransportError({ status: 500, data: { timestamp: 1, status: 500, error: 'Internal Server Error' } })).toMatch(
      /已打到对端/,
    )
  })

  it('代理 ECONNREFUSED 算未连通', () => {
    expect(
      describeTransportError({
        status: 500,
        data: 'http proxy error: /api/user/login\nAggregateError [ECONNREFUSED]',
      }),
    ).toMatch(/代理连不上后端/)
  })
})
