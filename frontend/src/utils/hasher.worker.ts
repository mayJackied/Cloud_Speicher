import init, { hash_chunk } from '../../../wasm-hasher/pkg/wasm_hasher.js';

// 1. Initialize WASM once when worker starts
const wasmReady = init();

self.onmessage = async (event: MessageEvent<{ chunk: ArrayBuffer; index: number }>) => {
  await wasmReady;

  const { chunk, index } = event.data;
  const bytes = new Uint8Array(chunk);

  // 2. Compute hash off the main thread
  const hash = hash_chunk(bytes);

  // 3. Send results back to main thread
  self.postMessage({ index, hash, size: chunk.byteLength });
};