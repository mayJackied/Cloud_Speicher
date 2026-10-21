import { onMounted, onUnmounted, ref } from 'vue'

/** 壳层窄屏：抽屉导航 / 预览按需 / 隐藏时钟。 */
export function useShellBreakpoints() {
  const drawerNav = ref(false)
  const phone = ref(false)

  let mqNav: MediaQueryList | null = null
  let mqPhone: MediaQueryList | null = null

  function sync() {
    drawerNav.value = Boolean(mqNav?.matches)
    phone.value = Boolean(mqPhone?.matches)
  }

  onMounted(() => {
    mqNav = window.matchMedia('(max-width: 1023px)')
    mqPhone = window.matchMedia('(max-width: 720px)')
    sync()
    mqNav.addEventListener('change', sync)
    mqPhone.addEventListener('change', sync)
  })

  onUnmounted(() => {
    mqNav?.removeEventListener('change', sync)
    mqPhone?.removeEventListener('change', sync)
  })

  return { drawerNav, phone }
}
