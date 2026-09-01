<template>
  <div class="frame" :class="{ 'is-drop': drop, 'is-fill': fill }">
    <div class="frame__grid" aria-hidden="true" />
    <div class="frame__spine frame__spine--l" aria-hidden="true">SOLAR_WASH // DEVELOPMENT</div>
    <div class="frame__spine frame__spine--l2" aria-hidden="true">SPEICHER_V04</div>
    <div class="frame__spine frame__spine--r" aria-hidden="true">EMULSION:FERRIC</div>
    <div class="frame__spine frame__spine--r2" aria-hidden="true">STABLE_READY</div>
    <p v-if="drop" class="frame__drop">{{ t('drive.drop') }}</p>
    <div v-if="clock" class="frame__time">
      <Timeboard />
    </div>
    <div class="frame__slot">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import Timeboard from './Timeboard.vue'

withDefaults(
  defineProps<{
    drop?: boolean
    fill?: boolean
    clock?: boolean
  }>(),
  {
    clock: true,
  },
)

const { t } = useI18n()
</script>

<style scoped>
.frame {
  position: relative;
  min-height: 100vh;
  color: var(--arc-ink);
  background: radial-gradient(120% 90% at 100% 0%, var(--arc-canvas-3), var(--arc-canvas));
  font-family: var(--arc-mono);
}

.frame.is-fill {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}

.frame.is-fill .frame__slot {
  position: relative;
  z-index: 3;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.frame.is-drop {
  outline: 1px solid var(--arc-lime);
  outline-offset: -8px;
}

.frame__grid {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, #1a3b4e14 1px, transparent 1px),
    linear-gradient(to bottom, #1a3b4e14 1px, transparent 1px);
  background-size: 28px 28px;
}

.frame__spine {
  pointer-events: none;
  position: absolute;
  z-index: 4;
  font-size: 9px;
  letter-spacing: 0.28em;
  color: rgb(235 244 246 / 28%);
  white-space: nowrap;
}

.frame__spine--l,
.frame__spine--l2 {
  left: 0.4rem;
  transform: rotate(-90deg);
  transform-origin: left top;
}

.frame__spine--l {
  top: 42%;
}

.frame__spine--l2 {
  top: 78%;
}

.frame__spine--r,
.frame__spine--r2 {
  right: 0.4rem;
  transform: rotate(90deg);
  transform-origin: right top;
}

.frame__spine--r {
  top: 28%;
}

.frame__spine--r2 {
  top: 62%;
  color: var(--arc-lime);
}

.frame__time {
  position: absolute;
  z-index: 6;
  top: 1.05rem;
  right: 1.6rem;
  width: 18.5rem;
}

.frame__drop {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  margin: 0;
  background: rgb(6 19 27 / 55%);
  color: var(--arc-lime);
  letter-spacing: 0.24em;
  pointer-events: none;
}
</style>
