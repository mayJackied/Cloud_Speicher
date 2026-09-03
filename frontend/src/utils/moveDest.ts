/** 可写目录规则：根目录不可写；自己房间可写；公共仅管理员可写。 */

export function isForbiddenMoveDest(
  destCrumbs: readonly string[],
  sourceCrumbs: readonly string[],
  movingName: string,
  movingIsFile: boolean,
): boolean {
  if (destCrumbs.length === 0) {
    return true
  }
  if (!movingIsFile) {
    const movingPath = [...sourceCrumbs, movingName]
    if (
      destCrumbs.length >= movingPath.length &&
      movingPath.every((name, index) => name === destCrumbs[index])
    ) {
      return true
    }
  }
  return false
}

export function isSameFolder(destCrumbs: readonly string[], sourceCrumbs: readonly string[]): boolean {
  return destCrumbs.length === sourceCrumbs.length && destCrumbs.every((name, index) => name === sourceCrumbs[index])
}

export function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

