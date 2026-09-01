import { storeToRefs } from 'pinia'
import { lookupMessage } from '@/i18n/messages'
import { useLocaleStore } from '@/stores/locale'

export function useI18n() {
  const store = useLocaleStore()
  const { locale } = storeToRefs(store)

  function t(path: string, vars?: Record<string, string | number>): string {
    let text = lookupMessage(store.locale, path)
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${key}}`, String(value))
      }
    }
    return text
  }

  return { locale, t, setLocale: store.setLocale }
}
