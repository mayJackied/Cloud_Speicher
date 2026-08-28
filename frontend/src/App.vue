<template>
  <div>
    <nav v-if="isDev">
      <router-link to="/drive">网盘</router-link>
      |
      <router-link to="/login">登录</router-link>
      |
      <router-link to="/register">注册</router-link>
      |
      <router-link to="/dev/contract">契约</router-link>
      |
      <router-link to="/dev/smoke">冒烟</router-link>
    </nav>
    <router-view />
    <section v-if="isDev" style="padding: 2rem; font-family: monospace;">
      <h2>Rust WASM Hasher Test</h2>
      <input type="file" @change="handleFileSelect" />
      <p v-if="loading">Processing chunks in Rust WASM...</p>
      <div v-if="manifest.length" style="margin-top: 1rem;">
        <h3>Generated Chunk Manifest ({{ manifest.length }} total chunks):</h3>
        <pre style="background: #1e1e1e; color: #4ec9b0; padding: 1rem; border-radius: 6px; overflow-x: auto;">
{{ JSON.stringify(manifest, null, 2) }}
        </pre>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { processFileInChunks, type ChunkManifestItem } from './utils/chunker'

const isDev = import.meta.env.DEV
const loading = ref(false)
const manifest = ref<ChunkManifestItem[]>([])

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const file = target.files[0]
  loading.value = true
  manifest.value = []

  console.time('WASM Hashing Duration')
  try {
    manifest.value = await processFileInChunks(file)
    console.log('Success! Chunk Manifest:', manifest.value)
  } catch (err) {
    console.error('Hashing failed:', err)
  } finally {
    console.timeEnd('WASM Hashing Duration')
    loading.value = false
  }
}
</script>
