import { isLegalFileName, sanitizePathSegments } from '@/types/file'
import { decodeFileName } from '@/utils/text'

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
