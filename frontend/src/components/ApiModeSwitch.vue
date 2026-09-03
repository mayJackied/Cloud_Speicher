<template>
  <nav class="arc-langs" :aria-label="t('settings.connection')">
    <button type="button" :class="{ 'is-on': mode === 'offline' }" @click="setMode('offline')">
      {{ t('drive.linkOffline') }}
    </button>
    <button type="button" :class="{ 'is-on': mode === 'online' }" @click="setMode('online')">
      {{ t('drive.linkOnline') }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { useApiLink } from '@/composables/useApiLink'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const { mode, setMode } = useApiLink()
</script>
