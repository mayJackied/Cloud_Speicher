import { isLegalFileName, sanitizePathSegments } from '@/types/file'
import { availableCopyName, decodeFileName } from '@/utils/text'

export interface FolderUploadItem {
  file: File
  /** 相对当前目录的父目录段，例如 `docs/a/b.txt` → `['docs', 'a']`。 */
  dirSegments: string[]
}

export interface FolderUploadPlan {
  items: FolderUploadItem[]
  skipped: number
}

/** `webkitRelativePath`（目录选择器）或拖放时手动带上的相对路径。 */
export function relativePathOf(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  return rel || file.name
}

/**
 * 把目录选择器给出的文件按相对路径拆成「父目录段 + 文件」。
 * 任一段或文件名非法就整条跳过（计入 skipped），不改名、不截断。
 */
export function planFolderUpload(
  files: readonly File[],
  relativePath: (file: File) => string = relativePathOf,
): FolderUploadPlan {
  const items: FolderUploadItem[] = []
  let skipped = 0
  for (const file of files) {
    const parts = relativePath(file).replace(/\\/g, '/').split('/')
    const name = decodeFileName(parts.pop() ?? '')
    const dirSegments = sanitizePathSegments(parts)
    if (!dirSegments || !isLegalFileName(name)) {
      skipped += 1
      continue
    }
    items.push({ file, dirSegments })
  }
  return { items, skipped }
}

/**
 * 顶层文件夹与当前目录已有条目重名时换成「名(1)」，整棵子树跟着改，
 * 不往已有文件夹里合并（后端撞名语义未定，避免覆盖或追加到旧文件）。
 */
export function avoidTopFolderClash(
  items: readonly FolderUploadItem[],
  taken: Iterable<string>,
): FolderUploadItem[] {
  const used = new Set(taken)
  const renamed = new Map<string, string>()
  return items.map((item) => {
    const top = item.dirSegments[0]
    if (top === undefined) {
      return item
    }
    let next = renamed.get(top)
    if (next === undefined) {
      next = availableCopyName(used, top)
      used.add(next)
      renamed.set(top, next)
    }
    return next === top ? item : { ...item, dirSegments: [next, ...item.dirSegments.slice(1)] }
  })
}
