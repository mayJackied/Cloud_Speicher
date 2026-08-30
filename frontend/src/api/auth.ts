import { api } from './client'
import type { LoginDTO, RegisterDTO } from '@/types/auth'
import type { CheckUserNameDTO, CheckUserNameVO } from '@/types/user'
import type { LoginVO } from '@/types/login'
import type { Result } from '@/types/result'

export function checkUserName(dto: CheckUserNameDTO) {
  return api.post<Result<CheckUserNameVO>>('/user/checkUserName', dto)
}

export function register(dto: RegisterDTO) {
  return api.post<Result<LoginVO>>('/user/register', dto)
}

export function login(dto: LoginDTO) {
  return api.post<Result<LoginVO>>('/user/login', dto)
}

export function deleteUser() {
  return api.post<Result<null>>('/user/delete')
}
