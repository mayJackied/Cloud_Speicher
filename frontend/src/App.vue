<template>
  <div class="app-root" :class="{ 'app-root--shell': isShell }">
    <header v-if="showChrome" class="app-header">
      <BrandLogo />
    </header>
    <nav v-if="isDev && showChrome">
      <router-link to="/drive">网盘</router-link>
      |
      <router-link to="/login">登录</router-link>
      |
      <router-link to="/register">注册</router-link>
      |
      <router-link to="/dev/contract">契约</router-link>
      |
      <router-link to="/dev/smoke">冒烟</router-link>
      |
      <router-link to="/dev/hasher">Hasher</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/BrandLogo.vue'

const isDev = import.meta.env.DEV
const route = useRoute()
const showChrome = computed(() => !route.meta.hideChrome)
const isShell = computed(() => String(route.name ?? '').startsWith('drive'))

watch(
  isShell,
  (value) => {
    document.documentElement.classList.toggle('arc-shell', value)
  },
  { immediate: true },
)

onUnmounted(() => {
  document.documentElement.classList.remove('arc-shell')
})
</script>

<style scoped>
.app-root {
  min-height: 100%;
}

.app-root--shell {
  height: 100%;
  overflow: hidden;
}
</style>
