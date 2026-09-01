<template>
  <nav class="arc-langs" :aria-label="t('auth.language')">
    <button
      v-for="code in LOCALES"
      :key="code"
      type="button"
      :class="{ 'is-on': locale === code }"
      @click="setLocale(code)"
    >
      {{ t(`lang.${code}`) }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import { LOCALES } from '@/i18n/messages'
import { useI18n } from '@/composables/useI18n'

const { locale, t, setLocale } = useI18n()
</script>
