<template>
  <button class="timeboard" type="button" :title="title" @click="cycle">
    <div class="timeboard__row" :class="{ 'is-tick': ticked }">
      <span>{{ t('clock.local') }}</span>
      <b>{{ local }}</b>
      <em>{{ meridiem ? t(`clock.${meridiem}`) : '' }}</em>
      <i>{{ offset }}</i>
    </div>
    <div class="timeboard__row timeboard__row--utc">
      <span>{{ t('clock.utc') }}</span>
      <b>{{ utc }}</b>
      <em></em>
      <i>{{ t('clock.z') }}</i>
    </div>
    <div class="timeboard__meta">
      <span>{{ date }}</span>
      <span>{{ zone }}</span>
      <span>{{ uptime }}</span>
    </div>
    <div class="timeboard__pulse" aria-hidden="true">
      <i :style="{ width: pulse + '%' }" />
    </div>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { useTimeboard } from '@/composables/useTimeboard'

const { t } = useI18n()
const { local, utc, meridiem, offset, date, zone, uptime, pulse, ticked, title, cycle } = useTimeboard()
</script>

<style scoped>
.timeboard {
  display: block;
  width: 100%;
  min-width: 17.5rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.timeboard__row {
  display: grid;
  grid-template-columns: 4.2rem minmax(7.4rem, 1fr) 1.8rem 3.6rem;
  gap: 0.35rem;
  align-items: baseline;
  color: var(--arc-ink);
  font-size: 11px;
  letter-spacing: 0.12em;
}

.timeboard__row--utc {
  margin-top: 0.2rem;
  color: rgb(235 244 246 / 48%);
  font-size: 10px;
}

.timeboard__row span {
  color: rgb(235 244 246 / 38%);
  font-size: 8px;
  letter-spacing: 0.18em;
}

.timeboard__row b {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.timeboard__row em {
  font-style: normal;
  color: rgb(235 244 246 / 55%);
  font-size: 8px;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.timeboard__row i {
  font-style: normal;
  color: rgb(235 244 246 / 38%);
  font-size: 8px;
  letter-spacing: 0.14em;
  white-space: nowrap;
  text-align: right;
}

.timeboard__row.is-tick b {
  color: #fff;
}

.timeboard__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.4rem;
  color: rgb(235 244 246 / 38%);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.timeboard__pulse {
  width: 7.5rem;
  height: 1px;
  margin-top: 0.4rem;
  background: rgb(235 244 246 / 12%);
}

.timeboard__pulse i {
  display: block;
  height: 100%;
  background: var(--arc-ink);
}
</style>
