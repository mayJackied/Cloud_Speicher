export interface ChunkManifestItem {
  index: number
  hash: string
  size: number
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function processFileInChunks(
  file: File,
  chunkSize = 4 * 1024 * 1024,
): Promise<ChunkManifestItem[]> {
  const manifest: ChunkManifestItem[] = []
  let index = 0

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const slice = file.slice(offset, offset + chunkSize)
    const arrayBuffer = await slice.arrayBuffer()
    const hash = await sha256Hex(new Uint8Array(arrayBuffer))
    manifest.push({ index, hash, size: slice.size })
    index += 1
  }

  return manifest
}
