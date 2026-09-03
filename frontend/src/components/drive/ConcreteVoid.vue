<template>
  <figure class="void" :data-kind="kind">
    <AsciiGlyph
      v-if="kind === 'empty'"
      class="void__glyph"
      :src="nutSrc"
      :fallback="ASCII_NUT"
      :cols="34"
      :rows="20"
    />
    <pre v-else class="void__glyph" aria-hidden="true">{{ ASCII_WAVE }}</pre>
    <figcaption class="void__cap">
      <p class="void__word">{{ word }}</p>
      <p class="void__line">{{ line }}</p>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { ASCII_NUT, ASCII_WAVE, type VoidKind } from '@/utils/concreteAscii'
import AsciiGlyph from './AsciiGlyph.vue'
import nutSrc from '@/assets/glyphs/nut.png'

const props = defineProps<{
  kind: VoidKind
}>()

const { t } = useI18n()
const word = computed(() => (props.kind === 'search' ? t('drive.searchEmptyWord') : t('drive.emptyWord')))
const line = computed(() => (props.kind === 'search' ? t('drive.searchEmptyLine') : t('drive.emptyLine')))
</script>

<style scoped>
.void {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1.15rem;
  min-height: 16rem;
  margin: 0;
  padding: 1.5rem 1rem 2rem;
  background:
    radial-gradient(ellipse 70% 55% at 50% 42%, rgb(26 90 118 / 22%), transparent 70%);
}

.void__glyph {
  margin: 0;
  color: var(--arc-chem);
  font-family: var(--arc-mono);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: 0.04em;
}

.void[data-kind='search'] .void__glyph {
  color: rgb(76 166 164 / 78%);
}

.void__cap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  max-width: 22rem;
  text-align: center;
}

.void__word {
  margin: 0;
  color: var(--arc-lime);
  font-family: var(--arc-mono);
  font-size: 10px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
}

.void__line {
  margin: 0;
  color: rgb(235 244 246 / 52%);
  font-family: var(--arc-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  line-height: 1.7;
}
</style>
