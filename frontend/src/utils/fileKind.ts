export type FileKind = 'folder' | 'image' | 'video' | 'pdf' | 'document' | 'archive' | 'file'

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function kindOf(node: { isFile: boolean; fileName: string }): FileKind {
  if (!node.isFile) {
    return 'folder'
  }
  const ext = extOf(node.fileName)
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    return 'video'
  }
  if (ext === 'pdf') {
    return 'pdf'
  }
  if (['zip', '7z', 'tar', 'gz'].includes(ext)) {
    return 'archive'
  }
  if (['txt', 'md', 'doc', 'docx', 'rtf', 'csv', 'json'].includes(ext)) {
    return 'document'
  }
  return 'file'
}

export function typeLabel(kind: FileKind, fileName: string): string {
  if (kind === 'folder') {
    return 'DIRECTORY'
  }
  const ext = extOf(fileName)
  if (kind === 'image') {
    return `IMAGE / ${ext.toUpperCase() || 'RASTER'}`
  }
  if (kind === 'video') {
    return `VIDEO / ${ext.toUpperCase()}`
  }
  if (kind === 'pdf') {
    return 'DOCUMENT / PDF'
  }
  if (kind === 'archive') {
    return `ARCHIVE / ${ext.toUpperCase()}`
  }
  if (kind === 'document') {
    return `DOCUMENT / ${ext.toUpperCase()}`
  }
  return ext ? `FILE / ${ext.toUpperCase()}` : 'FILE'
}

export function mimeFromName(name: string): string {
  const ext = extOf(name)
  if (ext === 'jpg' || ext === 'jpeg') {
    return 'image/jpeg'
  }
  if (ext === 'png') {
    return 'image/png'
  }
  if (ext === 'gif') {
    return 'image/gif'
  }
  if (ext === 'webp') {
    return 'image/webp'
  }
  if (ext === 'bmp') {
    return 'image/bmp'
  }
  if (ext === 'svg') {
    return 'image/svg+xml'
  }
  if (ext === 'mp4') {
    return 'video/mp4'
  }
  if (ext === 'webm') {
    return 'video/webm'
  }
  if (ext === 'mov') {
    return 'video/quicktime'
  }
  if (ext === 'mkv') {
    return 'video/x-matroska'
  }
  return 'application/octet-stream'
}

export function needsPosterFrame(node: { isFile: boolean; fileName: string }): boolean {
  if (!node.isFile) {
    return false
  }
  const ext = extOf(node.fileName)
  return ext === 'gif' || kindOf(node) === 'video'
}
