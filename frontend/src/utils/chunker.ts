import init, { hash_chunk } from '../../../wasm-hasher/pkg/wasm_hasher.js';

export interface ChunkManifestItem {
  index: number;
  hash: string;
  size: number;
}

export async function processFileInChunks(
  file: File,
  chunkSize: number = 4 * 1024 * 1024
): Promise<ChunkManifestItem[]> {
  await init();
  const manifest: ChunkManifestItem[] = [];
  let index = 0;

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const slice = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hash = hash_chunk(bytes);

    manifest.push({ index, hash, size: slice.size });
    index++;
  }

  return manifest;
}