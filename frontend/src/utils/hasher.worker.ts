async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

self.onmessage = async (event: MessageEvent<{ chunk: ArrayBuffer; index: number }>) => {
  const { chunk, index } = event.data
  const hash = await sha256Hex(new Uint8Array(chunk))
  self.postMessage({ index, hash, size: chunk.byteLength })
}
