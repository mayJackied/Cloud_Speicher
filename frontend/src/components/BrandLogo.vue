<template>
  <router-link :to="to" class="font-natto brand-logo">
    {{ title }}
  </router-link>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    to?: string
  }>(),
  {
    title: 'Cloud Speicher',
    to: '/drive',
  },
)
</script>

<style scoped>
.brand-logo {
  display: inline-block;
  color: inherit;
  text-decoration: none;
  font-size: 1.5rem;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.brand-logo:hover {
  text-decoration: underline;
}
</style>
