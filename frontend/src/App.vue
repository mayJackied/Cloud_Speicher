<template>
  <div>
    <nav v-if="isDev">
      <router-link to="/register">注册</router-link>
      |
      <router-link to="/dev/contract">契约</router-link>
      |
      <router-link to="/dev/smoke">冒烟</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
const isDev = import.meta.env.DEV
</script>
