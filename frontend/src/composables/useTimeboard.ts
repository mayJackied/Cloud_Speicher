import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  formatClock,
  formatClockDate,
  formatUptime,
  formatUtcOffset,
  meridiemToken,
  nextClockMode,
  resolveTimeZone,
  type ClockMode,
} from '@/utils/timeboard'

export function useTimeboard() {
  const { t, locale } = useI18n()
  const startedAt = Date.now()
  const mode = ref<ClockMode>(0)
  const local = ref('00:00:00.00')
  const utc = ref('00:00:00.00')
  const offset = ref('UTC+0')
  const meridiem = ref<'am' | 'pm' | ''>('')
  const date = ref('0000-00-00')
  const zone = ref(resolveTimeZone())
  const uptime = ref('T+ 00:00:00')
  const pulse = ref(0)
  const ticked = ref(false)

  let raf = 0
  let lastSec = -1
  let tickTimer = 0

  function paint() {
    const d = new Date()
    const withMs = mode.value !== 1
    const h12 = mode.value === 2
    local.value = formatClock(d, false, withMs, h12)
    utc.value = formatClock(d, true, withMs, false)
    meridiem.value = meridiemToken(d, h12)
    offset.value = formatUtcOffset(d)
    date.value = formatClockDate(d, locale.value)
    uptime.value = formatUptime(startedAt, d.getTime())
    pulse.value = d.getMilliseconds() / 10
    const sec = d.getSeconds()
    if (sec !== lastSec) {
      lastSec = sec
      ticked.value = true
      window.clearTimeout(tickTimer)
      tickTimer = window.setTimeout(() => {
        ticked.value = false
      }, 90)
    }
  }

  function loop() {
    if (!document.hidden) {
      paint()
    }
    raf = window.requestAnimationFrame(loop)
  }

  function cycle() {
    mode.value = nextClockMode(mode.value)
  }

  const title = computed(() => t('clock.cycle', { format: t(`clock.mode${mode.value}`) }))

  onMounted(() => {
    paint()
    raf = window.requestAnimationFrame(loop)
  })

  onUnmounted(() => {
    window.cancelAnimationFrame(raf)
    window.clearTimeout(tickTimer)
  })

  return {
    local,
    utc,
    meridiem,
    offset,
    date,
    zone,
    uptime,
    pulse,
    ticked,
    title,
    cycle,
  }
}
