export type DriveAccessInput = {
  crumbs: readonly string[]
  userId: number | null | undefined
  isAdmin: boolean
}

function topFolder(crumbs: readonly string[]): string | null {
  return crumbs[0] ?? null
}

export function isOwnRoom(input: DriveAccessInput): boolean {
  const top = topFolder(input.crumbs)
  return input.userId != null && top === String(input.userId)
}

export function isPublicSpace(input: DriveAccessInput): boolean {
  return topFolder(input.crumbs) === 'public'
}

/** 自己的房间可改；公共空间只有管理员可增删改上传。 */
export function canWriteInFolder(input: DriveAccessInput): boolean {
  if (input.crumbs.length === 0) {
    return false
  }
  if (isOwnRoom(input)) {
    return true
  }
  return isPublicSpace(input) && input.isAdmin
}

/** 自己的房间和公共空间都可以下载；根目录（两棵树）不能下。 */
export function canDownloadInFolder(input: DriveAccessInput): boolean {
  if (input.crumbs.length === 0) {
    return false
  }
  return isOwnRoom(input) || isPublicSpace(input)
}
