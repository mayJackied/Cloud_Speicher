import type { FilesVO } from '@/types/file'
import { isTrashMetaName } from '@/utils/trashMeta'

/** 个人房间根下的回收站文件夹名（现网磁盘上是 recycle_bin）。 */
export const RECYCLE_BIN_NAME = 'recycle_bin'

export function isRecycleBinName(name: string): boolean {
  return name.toLowerCase() === RECYCLE_BIN_NAME
}

/** 当前是否在个人回收站里（含其子目录）。 */
export function isInTrash(crumbs: readonly string[], userId: number | undefined): boolean {
  if (userId == null || crumbs.length < 2) {
    return false
  }
  return crumbs[0] === String(userId) && isRecycleBinName(crumbs[1] ?? '')
}

/** 个人房间根下的回收站文件夹本身（不可删 / 不可改名 / 不可挪走）。 */
export function isProtectedRecycleBin(
  crumbs: readonly string[],
  node: Pick<FilesVO, 'fileName' | 'isFile'>,
  userId: number | undefined,
): boolean {
  if (userId == null || node.isFile || crumbs.length !== 1) {
    return false
  }
  return crumbs[0] === String(userId) && isRecycleBinName(node.fileName)
}

export function findRecycleBin(room: FilesVO | null | undefined): FilesVO | null {
  const kids = room?.filesVOS ?? []
  return kids.find((node) => !node.isFile && isRecycleBinName(node.fileName)) ?? null
}

export function trashItemCount(room: FilesVO | null | undefined): number {
  const bin = findRecycleBin(room)
  return (bin?.filesVOS ?? []).filter((node) => !isTrashMetaName(node.fileName)).length
}
