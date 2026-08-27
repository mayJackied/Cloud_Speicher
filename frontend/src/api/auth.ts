import { api } from './client'
import type { RegisterDTO, RegisterResult } from '@/types/auth'

export function register(dto: RegisterDTO) {
  return api.post<RegisterResult>('/user/register', dto)
}
