export interface UserVO {
  userId: number
  name: string
  isDeleted: boolean
  documentId: number | null
  isAdmin: boolean
}

export const USER_VO_KEYS = ['userId', 'name', 'isDeleted', 'documentId', 'isAdmin'] as const
