<template>
  <main>
    <h1>Hasher</h1>
    <p>分块 SHA-256。本机没有 wasm-pack 生成的 <code>wasm-hasher/pkg</code>，当前用浏览器 Web Crypto，不挡登录/注册。</p>
    <p>
      <input type="file" @change="onFile" />
    </p>
    <p v-if="loading">计算中…</p>
    <p v-if="error">{{ error }}</p>
    <pre v-if="manifest.length">{{ JSON.stringify(manifest, null, 2) }}</pre>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { processFileInChunks, type ChunkManifestItem } from '@/utils/chunker'

const loading = ref(false)
const error = ref('')
const manifest = ref<ChunkManifestItem[]>([])

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }
  loading.value = true
  error.value = ''
  manifest.value = []
  try {
    manifest.value = await processFileInChunks(file)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '哈希失败'
  } finally {
    loading.value = false
  }
}
</script>
