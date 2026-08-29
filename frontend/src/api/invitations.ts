import { api } from './client'
import type { CreatInviteCodeVO } from '@/types/invite'
import type { Result } from '@/types/result'

export function creatInviteCode() {
  return api.get<Result<CreatInviteCodeVO>>('/user/creatInviteCode')
}
