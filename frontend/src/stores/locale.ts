import { defineStore } from 'pinia'
import { LOCALES, LOCALE_KEY, type Locale } from '@/i18n/messages'

function isLocale(value: string | null): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value))
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (isLocale(saved)) {
      return saved
    }
  } catch {
    /* private mode */
  }
  const lang = typeof navigator === 'undefined' ? 'zh-CN' : navigator.language.toLowerCase()
  if (lang.startsWith('de')) {
    return 'de'
  }
  if (lang.startsWith('en')) {
    return 'en'
  }
  return 'zh-CN'
}

function applyDocumentLang(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
    document.documentElement.dataset.locale = locale
  }
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: detectLocale() as Locale,
  }),
  actions: {
    setLocale(locale: Locale) {
      this.locale = locale
      try {
        localStorage.setItem(LOCALE_KEY, locale)
      } catch {
        /* ignore */
      }
      applyDocumentLang(locale)
    },
    hydrate() {
      applyDocumentLang(this.locale)
    },
  },
})
