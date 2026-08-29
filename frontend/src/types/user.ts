export interface CheckUserNameDTO {
  name: string
}

export interface CheckUserNameVO {
  isAvailable: boolean
}

export const CHECK_USER_NAME_DTO_KEYS = ['name'] as const
