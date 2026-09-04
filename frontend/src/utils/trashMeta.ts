import { FILE_STORAGE_PREFIX } from '@/types/file'

/** 放在 recycle_bin 里，记录「回收站内文件名 → 删除前位置」（尽力同步；以 localStorage 为准）。 */
export const TRASH_META_NAME = '_trash_meta.json'

export type TrashMetaEntry = {
  /** 删除前所在目录，如 `../files/8/docs` */
  from: string
  /** 删除前的文件名 */
  name: string
}

export type TrashMeta = Record<string, TrashMetaEntry>

export function isTrashMetaName(name: string): boolean {
  return (
    name === TRASH_META_NAME ||
    name.startsWith('_trash_meta') ||
    name.startsWith('_restore_')
  )
}

export function parseTrashMeta(data: unknown): TrashMeta {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }
  const out: TrashMeta = {}
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (!key || isTrashMetaName(key) || !val || typeof val !== 'object' || Array.isArray(val)) {
      continue
    }
    const row = val as { from?: unknown; name?: unknown }
    if (typeof row.from === 'string' && row.from && typeof row.name === 'string' && row.name) {
      out[key] = { from: row.from.replace(/\\/g, '/'), name: row.name }
    }
  }
  return out
}

export function parseTrashMetaText(raw: string): TrashMeta {
  try {
    return parseTrashMeta(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export function serializeTrashMeta(meta: TrashMeta): string {
  return JSON.stringify(meta)
}

/** `../files/8/docs` → `['8','docs']` */
export function serverPathSegments(path: string): string[] | null {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  if (normalized === FILE_STORAGE_PREFIX) {
    return []
  }
  const prefix = `${FILE_STORAGE_PREFIX}/`
  if (!normalized.startsWith(prefix)) {
    return null
  }
  return normalized.slice(prefix.length).split('/').filter(Boolean)
}

export function isUnderUserRoom(path: string, userId: number): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const prefix = `${FILE_STORAGE_PREFIX}/${userId}`
  return normalized === prefix || normalized.startsWith(`${prefix}/`)
}

export function trashMetaStorageKey(userId: number): string {
  return `nd.trashMeta.v1.${userId}`
}

export function readLocalTrashMeta(userId: number): TrashMeta {
  try {
    return parseTrashMetaText(localStorage.getItem(trashMetaStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

export function writeLocalTrashMeta(userId: number, meta: TrashMeta): void {
  try {
    localStorage.setItem(trashMetaStorageKey(userId), serializeTrashMeta(meta))
  } catch {
    /* quota / private mode */
  }
}

/** 合并索引：local 覆盖同名键（本机删除记录优先）。 */
export function mergeTrashMeta(fileMeta: TrashMeta, localMeta: TrashMeta): TrashMeta {
  return { ...fileMeta, ...localMeta }
}

export function roomDirOf(userId: number): string {
  return `${FILE_STORAGE_PREFIX}/${userId}`
}

/**
 * 回收站内落盘名：保留原扩展名，前缀唯一 ID（接近 Windows 回收站 $Rxxxxx），
 * 这样原目录立刻空出同名，删除后再上传同名不会和回收站项打架。
 */
export function makeTrashStoredName(
  originalName: string,
  nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
): string {
  const base = originalName.normalize('NFC')
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot) : ''
  const safe = nonce.replace(/[^A-Za-z0-9]/g, '').slice(0, 16) || 'x'
  return `$R${safe}${ext}`
}

/**
 * 解析还原目标。只应在回收站根目录还原「删除时的那一项」；
 * 若人在回收站子文件夹里，返回 nested=true，UI 应提示还原整个文件夹。
 */
export function resolveRestoreLocation(input: {
  crumbs: readonly string[]
  fileName: string
  meta: TrashMeta
  userId: number
}): { targetDir: string; wantName: string; nested: boolean } {
  const roomDir = roomDirOf(input.userId)
  if (input.crumbs.length > 2) {
    return { targetDir: roomDir, wantName: input.fileName, nested: true }
  }
  const entry = input.meta[input.fileName]
  if (entry?.from && isUnderUserRoom(entry.from, input.userId)) {
    return { targetDir: entry.from, wantName: entry.name || input.fileName, nested: false }
  }
  return { targetDir: roomDir, wantName: entry?.name || input.fileName, nested: false }
}

