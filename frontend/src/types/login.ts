export interface LoginVO {
  token: string
  userId: number
  name: string
  isAdmin: boolean
}

export const LOGIN_VO_KEYS = ['token', 'userId', 'name', 'isAdmin'] as const
