import { availableCopyName, decodeFileName } from '@/utils/text'

/** `archive.zip` → `archive`；无扩展名时回退为原名。 */
export function folderNameFromZip(fileName: string): string {
  const decoded = decodeFileName(fileName).trim()
  const stripped = decoded.replace(/\.zip$/i, '')
  return stripped || decoded || 'archive'
}

/** 在已有同级名中生成可用的解压文件夹名。 */
export function uniqueExtractFolderName(taken: readonly string[], zipFileName: string): string {
  return availableCopyName(taken, folderNameFromZip(zipFileName))
}

/** macOS 压缩包自带的资源叉垃圾目录。 */
export function isMacosxJunkName(name: string): boolean {
  return name === '__MACOSX'
}
