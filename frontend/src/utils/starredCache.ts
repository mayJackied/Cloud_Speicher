const PREFIX = 'arc-starred-paths:'

function normalized(path: string): string {
  return path.trim().replace(/\\/g, '/')
}

export function readStarredCache(userId: number): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${PREFIX}${userId}`) || '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return [...new Set(parsed.map((value) => normalized(String(value))).filter(Boolean))]
  } catch {
    return []
  }
}

export function writeStarredCache(userId: number, paths: readonly string[]): string[] {
  const next = [...new Set(paths.map(normalized).filter(Boolean))]
  try {
    localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify(next))
  } catch {
    // 隐私模式或存储配额不足时仍以服务端结果为准。
  }
  return next
}

export function addStarredCache(userId: number, path: string): string[] {
  return writeStarredCache(userId, [...readStarredCache(userId), path])
}

export function removeStarredCache(userId: number, path: string): string[] {
  const target = normalized(path)
  return writeStarredCache(
    userId,
    readStarredCache(userId).filter((value) => normalized(value) !== target),
  )
}

/** 重命名后把收藏路径（含目录前缀下的子项）改到新路径，避免再请求一次 getStarredFiles。 */
export function remapStarredPaths(
  paths: readonly string[],
  oldPath: string,
  newPath: string,
): string[] {
  const from = normalized(oldPath)
  const to = normalized(newPath)
  if (!from || from === to) {
    return [...new Set(paths.map(normalized).filter(Boolean))]
  }
  return [
    ...new Set(
      paths.map((path) => {
        const current = normalized(path)
        if (current === from) {
          return to
        }
        if (current.startsWith(`${from}/`)) {
          return `${to}${current.slice(from.length)}`
        }
        return current
      }),
    ),
  ]
}

export function remapStarredCache(userId: number, oldPath: string, newPath: string): string[] {
  return writeStarredCache(userId, remapStarredPaths(readStarredCache(userId), oldPath, newPath))
}
