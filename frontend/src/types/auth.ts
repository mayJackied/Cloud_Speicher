export interface RegisterDTO {
  name: string
  password: string
  inviteCode: string
}

export interface LoginDTO {
  name: string
  password: string
}

export const REGISTER_DTO_KEYS = ['name', 'password', 'inviteCode'] as const
export const LOGIN_DTO_KEYS = ['name', 'password'] as const
