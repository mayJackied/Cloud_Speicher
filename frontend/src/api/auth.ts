import { api } from './client'
import type { LoginDTO, RegisterDTO } from '@/types/auth'
import type { LoginVO } from '@/types/login'
import type { Result } from '@/types/result'

export function register(dto: RegisterDTO) {
  return api.post<Result<LoginVO>>('/user/register', dto)
}

export function login(dto: LoginDTO) {
  return api.post<Result<LoginVO>>('/user/login', dto)
}

export function getUsersName() {
  return api.get<Result<string[]>>('/user/getUsersName')
}
