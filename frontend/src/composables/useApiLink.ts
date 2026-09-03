import { computed } from 'vue'
import { linkReach } from '@/api/linkHealth'
import { useApiMode } from '@/composables/useApiMode'
import { useI18n } from '@/composables/useI18n'
import { linkStatusOf, type LinkStatus } from '@/utils/apiLink'

export function useApiLink() {
  const { mode, setMode } = useApiMode()
  const { t } = useI18n()
  const status = computed(() => linkStatusOf(mode.value, linkReach.value))
  const syncLabel = computed(() => syncLabelOf(status.value, t))
  const pillLabel = computed(() => pillLabelOf(status.value, t))

  return { mode, setMode, status, reach: linkReach, syncLabel, pillLabel }
}

function syncLabelOf(status: LinkStatus, t: (path: string) => string): string {
  if (status === 'offline') {
    return t('drive.syncLocal')
  }
  if (status === 'online') {
    return t('drive.syncStable')
  }
  if (status === 'unreachable') {
    return t('drive.syncBroken')
  }
  return t('drive.syncWait')
}

function pillLabelOf(status: LinkStatus, t: (path: string) => string): string {
  if (status === 'offline') {
    return t('drive.linkOffline')
  }
  if (status === 'online') {
    return t('drive.linkOnline')
  }
  if (status === 'unreachable') {
    return t('drive.linkUnreachable')
  }
  return t('drive.linkChecking')
}

