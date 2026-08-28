export interface CreatInviteCodeDTO {
  userId: number
  name: string
}

export interface CreatInviteCodeVO {
  inviteCode: string
}

export const CREAT_INVITE_CODE_DTO_KEYS = ['userId', 'name'] as const
export const CREAT_INVITE_CODE_VO_KEYS = ['inviteCode'] as const
