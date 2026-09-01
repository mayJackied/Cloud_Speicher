import { defineStore } from 'pinia'

export const THUMBS_KEY = 'arc-thumbnails'

function readThumbs(): boolean {
  try {
    const raw = localStorage.getItem(THUMBS_KEY)
    if (raw === '0') {
      return false
    }
  } catch {
    /* private mode */
  }
  return true
}

export const usePrefsStore = defineStore('prefs', {
  state: () => ({
    thumbnails: readThumbs(),
  }),
  actions: {
    setThumbnails(on: boolean) {
      this.thumbnails = on
      try {
        localStorage.setItem(THUMBS_KEY, on ? '1' : '0')
      } catch {
        /* ignore */
      }
    },
  },
})
