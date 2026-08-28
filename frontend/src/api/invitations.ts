import { api } from './client'
import type { CreatInviteCodeDTO, CreatInviteCodeVO } from '@/types/invite'
import type { Result } from '@/types/result'

export function creatInviteCode(dto: CreatInviteCodeDTO) {
  return api.post<Result<CreatInviteCodeVO>>('/user/creatInviteCode', dto)
}
