import { ref } from 'vue'
import { api } from '@/api/client'
import { resetLinkReach } from '@/api/linkHealth'
import type { ApiMode } from '@/utils/apiLink'

export type { ApiMode }

const MODE_KEY = 'apiMode'

function readMode(): ApiMode {
  return localStorage.getItem(MODE_KEY) === 'online' ? 'online' : 'offline'
}

function apply(mode: ApiMode) {
  api.defaults.headers.common['X-Api-Mode'] = mode
}

const mode = ref<ApiMode>(readMode())
apply(mode.value)

export function useApiMode() {
  function setMode(next: ApiMode) {
    mode.value = next
    localStorage.setItem(MODE_KEY, next)
    apply(next)
    resetLinkReach()
  }

  return { mode, setMode }
}

export function initApiMode() {
  apply(readMode())
}
