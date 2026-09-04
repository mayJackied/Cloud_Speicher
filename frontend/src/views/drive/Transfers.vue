<template>
  <ArchiveFrame fill :clock="false">
    <div class="transfer-shell">
      <DriveSidebar
        active="transfers"
        @open-mine="goDrive('mine')"
        @open-public="goDrive('public')"
        @open-root="goDrive('root')"
        @open-trash="goDrive('trash')"
        @note-offline="noteOffline"
        @logout="signOut"
      />

      <main class="transfer-main">
        <header class="transfer-head">
          <div>
            <p>{{ t('transfers.kicker') }}</p>
            <h1>{{ t('transfers.title') }}</h1>
          </div>
          <button type="button" @click="transfers.clearCompleted">
            {{ t('transfers.clearCompleted') }}
          </button>
        </header>

        <div class="transfer-filters" role="tablist">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            :class="{ 'is-on': filter === option.value }"
            @click="filter = option.value"
          >{{ option.label }} <span>{{ option.count }}</span></button>
        </div>

        <p class="transfer-hint">
          {{ offlineNote || (apiMode === 'offline' ? t('transfers.mockHint') : t('transfers.backendHint')) }}
        </p>

        <section class="transfer-list" aria-live="polite">
          <p v-if="!filtered.length" class="transfer-empty">{{ t('transfers.empty') }}</p>
          <article v-for="task in filtered" :key="task.id" class="transfer-card">
            <div class="transfer-card__top">
              <div class="transfer-name">
                <span class="transfer-direction">
                  {{ task.direction === 'upload' ? '↑' : '↓' }}
                </span>
                <div>
                  <h2>{{ task.fileName }}</h2>
                  <p>{{ statusLabel(task.status) }}</p>
                </div>
              </div>
              <strong>{{ transferProgress(task) }}%</strong>
            </div>

            <div class="transfer-progress">
              <i :style="{ width: `${transferProgress(task)}%` }" />
            </div>

            <div class="transfer-meta">
              <span>{{ formatBytes(task.transferredBytes) }} / {{ formatBytes(task.totalBytes) }}</span>
              <span>{{ task.speedBps > 0 ? `${formatBytes(task.speedBps)}/s` : '—' }}</span>
              <span v-if="task.remainingSeconds != null && task.status === 'running'">
                {{ t('transfers.remaining', { time: formatDuration(task.remainingSeconds) }) }}
              </span>
            </div>

            <dl>
              <div>
                <dt>{{ t('transfers.source') }}</dt>
                <dd>{{ task.sourcePath }}</dd>
              </div>
              <div>
                <dt>{{ t('transfers.destination') }}</dt>
                <dd>{{ task.saveLocation }}</dd>
              </div>
            </dl>

            <p v-if="task.errorMessage" class="transfer-error">
              {{ task.errorMessage === 'SOURCE_FILE_MISMATCH' ? t('transfers.sourceMismatch') : task.errorMessage }}
            </p>

            <div class="transfer-actions">
              <button
                v-if="['running', 'queued', 'waiting_backend'].includes(task.status)"
                type="button"
                @click="transfers.pause(task.id)"
              >{{ t('transfers.pause') }}</button>
              <button
                v-if="task.status === 'paused'"
                type="button"
                @click="transfers.resume(task.id)"
              >{{ t('transfers.resume') }}</button>
              <button
                v-if="task.status === 'needs_source'"
                type="button"
                @click="chooseSource(task.id)"
              >{{ t('transfers.chooseSource') }}</button>
              <button
                v-if="task.status === 'needs_destination'"
                type="button"
                @click="chooseDestination(task.id, task.fileName)"
              >{{ t('transfers.chooseDestination') }}</button>
              <button
                v-if="task.status === 'needs_destination'"
                type="button"
                @click="transfers.useBrowserDestination(task.id, t('transfers.defaultDownloads'))"
              >{{ t('transfers.browserDestination') }}</button>
              <button
                v-if="['failed', 'canceled'].includes(task.status)"
                type="button"
                @click="transfers.retry(task.id)"
              >{{ t('transfers.retry') }}</button>
              <button
                v-if="!['completed', 'canceled'].includes(task.status)"
                type="button"
                @click="transfers.cancel(task.id)"
              >{{ t('transfers.cancel') }}</button>
              <button
                v-if="['completed', 'canceled'].includes(task.status)"
                type="button"
                @click="transfers.remove(task.id)"
              >{{ t('transfers.remove') }}</button>
            </div>
          </article>
        </section>
        <input ref="fallbackInput" class="transfer-hidden" type="file" @change="onFallbackSource" />
      </main>
    </div>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import DriveSidebar from '@/components/drive/DriveSidebar.vue'
import { logout } from '@/api/auth'
import { readApiMode } from '@/api/client'
import { useDriveFiles } from '@/composables/useDriveFiles'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { transferProgress, useTransferStore } from '@/stores/transfers'
import type { FileSystemFileHandleLike, TransferFilter, TransferStatus } from '@/types/transfer'
import { formatBytes } from '@/utils/formatFile'

type PickerWindow = Window & {
  showOpenFilePicker?: (options?: object) => Promise<FileSystemFileHandleLike[]>
  showSaveFilePicker?: (options?: object) => Promise<FileSystemFileHandleLike>
}

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const transfers = useTransferStore()
const { load } = useDriveFiles()
const filter = ref<TransferFilter>('all')
const fallbackInput = ref<HTMLInputElement | null>(null)
const pendingSourceTask = ref('')
const offlineNote = ref('')
const apiMode = readApiMode()

const filters = computed(() => [
  { value: 'all' as const, label: t('transfers.all'), count: transfers.tasks.length },
  {
    value: 'upload' as const,
    label: t('transfers.uploads'),
    count: transfers.tasks.filter((task) => task.direction === 'upload').length,
  },
  {
    value: 'download' as const,
    label: t('transfers.downloads'),
    count: transfers.tasks.filter((task) => task.direction === 'download').length,
  },
  {
    value: 'completed' as const,
    label: t('transfers.completed'),
    count: transfers.tasks.filter((task) => task.status === 'completed').length,
  },
])

const filtered = computed(() => {
  if (filter.value === 'completed') {
    return transfers.tasks.filter((task) => task.status === 'completed')
  }
  if (filter.value === 'upload' || filter.value === 'download') {
    return transfers.tasks.filter((task) => task.direction === filter.value)
  }
  return transfers.tasks
})

const statusKeys: Record<TransferStatus, string> = {
  queued: 'statusQueued',
  running: 'statusRunning',
  paused: 'statusPaused',
  waiting_backend: 'statusWaitingBackend',
  needs_source: 'statusNeedsSource',
  needs_destination: 'statusNeedsDestination',
  completed: 'statusCompleted',
  failed: 'statusFailed',
  canceled: 'statusCanceled',
}

function statusLabel(status: TransferStatus) {
  return t(`transfers.${statusKeys[status]}`)
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}m ${rest}s`
}

function goDrive(channel: 'mine' | 'public' | 'root' | 'trash') {
  void router.push({ name: 'drive', query: { channel } })
}

function noteOffline(label: string) {
  offlineNote.value = label
}

async function chooseSource(taskId: string) {
  const picker = (window as PickerWindow).showOpenFilePicker
  if (picker) {
    try {
      const [handle] = await picker({ multiple: false })
      if (handle) {
        await transfers.attachSource(taskId, await handle.getFile(), handle)
      }
    } catch {
      /* user canceled */
    }
    return
  }
  pendingSourceTask.value = taskId
  fallbackInput.value?.click()
}

async function onFallbackSource(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && pendingSourceTask.value) {
    await transfers.attachSource(pendingSourceTask.value, file)
  }
  pendingSourceTask.value = ''
  input.value = ''
}

async function chooseDestination(taskId: string, fileName: string) {
  const picker = (window as PickerWindow).showSaveFilePicker
  if (!picker) {
    transfers.useBrowserDestination(taskId, t('transfers.defaultDownloads'))
    return
  }
  try {
    const handle = await picker({ suggestedName: fileName })
    await transfers.attachDestination(taskId, handle, handle.name)
  } catch {
    /* user canceled */
  }
}

async function signOut() {
  try {
    await logout()
  } catch {
    /* local session still needs to be cleared */
  }
  auth.logout()
  await router.replace('/login')
}

onMounted(() => {
  void transfers.hydrate()
  // 与网盘共用同一份树；已有数据时安静刷新，避免占用条从 0 跳变。
  void load({ quiet: true })
})
</script>

<style scoped>
.transfer-shell {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 13.5rem minmax(0, 1fr);
  height: 100%;
  overflow: hidden;
}

.transfer-head button,
.transfer-filters button,
.transfer-actions button {
  padding: 0.35rem 0;
  border: 0;
  background: none;
  color: rgb(235 244 246 / 62%);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.transfer-filters .is-on,
.transfer-actions button:hover {
  color: var(--arc-lime);
}

.transfer-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 1.25rem 1.5rem 2rem;
}

.transfer-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--arc-line);
}

.transfer-head p,
.transfer-hint {
  margin: 0;
  color: var(--arc-chem);
  font-size: 10px;
  letter-spacing: 0.18em;
}

.transfer-head h1 {
  margin: 0.35rem 0 0;
  font-family: var(--arc-display);
  font-size: clamp(1.4rem, 3vw, 2.2rem);
}

.transfer-filters {
  display: flex;
  gap: 1.25rem;
  padding: 1rem 0;
}

.transfer-filters span {
  color: var(--arc-chem);
}

.transfer-hint {
  padding: 0.75rem;
  border: 1px dashed rgb(235 244 246 / 22%);
  line-height: 1.6;
}

.transfer-list {
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
}

.transfer-empty {
  padding: 4rem 1rem;
  color: rgb(235 244 246 / 45%);
  text-align: center;
}

.transfer-card {
  padding: 1rem;
  border: 1px solid var(--arc-line);
  background: rgb(5 17 21 / 52%);
}

.transfer-card__top,
.transfer-name,
.transfer-meta,
.transfer-actions {
  display: flex;
  align-items: center;
}

.transfer-card__top {
  justify-content: space-between;
}

.transfer-name {
  gap: 0.75rem;
  min-width: 0;
}

.transfer-direction {
  color: var(--arc-lime);
  font-size: 1.4rem;
}

.transfer-name h2 {
  overflow: hidden;
  margin: 0;
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transfer-name p,
.transfer-meta,
dl,
.transfer-error {
  margin: 0.25rem 0 0;
  color: rgb(235 244 246 / 55%);
  font-size: 10px;
}

.transfer-card__top strong {
  color: var(--arc-lime);
  font-family: var(--arc-display);
}

.transfer-progress {
  height: 3px;
  margin: 0.9rem 0 0.55rem;
  background: rgb(235 244 246 / 14%);
}

.transfer-progress i {
  display: block;
  height: 100%;
  background: var(--arc-lime);
  transition: width 120ms linear;
}

.transfer-meta,
.transfer-actions {
  flex-wrap: wrap;
  gap: 0.8rem;
}

dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  padding: 0.75rem 0;
}

dl div {
  min-width: 0;
}

dt {
  color: var(--arc-chem);
  letter-spacing: 0.12em;
}

dd {
  overflow: hidden;
  margin: 0.2rem 0 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transfer-error {
  color: #ffb59f;
}

.transfer-hidden {
  display: none;
}

@media (max-width: 720px) {
  .transfer-shell {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  dl {
    grid-template-columns: 1fr;
  }
}
</style>
