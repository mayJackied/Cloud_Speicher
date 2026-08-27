export interface RegisterDTO {
  name: string
  password: string
  inviteCode: string
}

export type RegisterResult = boolean

export const REGISTER_CONTRACT_KEYS = ['name', 'password', 'inviteCode'] as const
