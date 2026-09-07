import { defineStore } from 'pinia'

export const THUMBS_KEY = 'arc-thumbnails'
export const TRANSFER_VIEW_KEY = 'arc-transfer-view'

export type TransferListView = 'detail' | 'compact'

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

function readTransferView(): TransferListView {
  try {
    const raw = localStorage.getItem(TRANSFER_VIEW_KEY)
    if (raw === 'compact' || raw === 'detail') {
      return raw
    }
  } catch {
    /* private mode */
  }
  return 'detail'
}

export const usePrefsStore = defineStore('prefs', {
  state: () => ({
    thumbnails: readThumbs(),
    transferView: readTransferView() as TransferListView,
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
    setTransferView(view: TransferListView) {
      this.transferView = view
      try {
        localStorage.setItem(TRANSFER_VIEW_KEY, view)
      } catch {
        /* ignore */
      }
    },
  },
})
