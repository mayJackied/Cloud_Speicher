<template>
  <aside class="drive-side">
    <p class="drive-side__brand">ARCHIVAL_CLOUD</p>
    <nav class="drive-side__nav">
      <button
        type="button"
        :class="{ 'is-on': active === 'mine', 'is-drop': dropSlot === 'mine' }"
        @click="emit('openMine')"
        @dragover="onOver('mine', $event)"
        @dragleave="emit('slotLeave', 'mine')"
        @drop.prevent="emit('dropMine')"
      >{{ t('drive.myDrive') }}</button>
      <button
        type="button"
        :class="{ 'is-on': active === 'public', 'is-drop': dropSlot === 'public' }"
        @click="emit('openPublic')"
        @dragover="onOver('public', $event)"
        @dragleave="emit('slotLeave', 'public')"
        @drop.prevent="emit('dropPublic')"
      >{{ t('drive.public') }}</button>
      <button
        type="button"
        :class="{ 'is-on': active === 'root' }"
        @click="emit('openRoot')"
      >{{ t('drive.root') }}</button>
      <button type="button" class="is-off" @click="emit('noteOffline', t('drive.recent'))">
        {{ t('drive.recent') }}
      </button>
      <button type="button" class="is-off" @click="emit('noteOffline', t('drive.starred'))">
        {{ t('drive.starred') }}
      </button>
      <button type="button" class="is-off" @click="emit('noteOffline', t('drive.shared'))">
        {{ t('drive.shared') }}
      </button>
      <router-link
        to="/drive/transfers"
        :class="{ 'is-on': active === 'transfers' }"
      >
        {{ t('drive.transfers') }}
        <span v-if="transferCount">[{{ transferCount }}]</span>
      </router-link>
      <button
        type="button"
        :class="{
          'is-on': active === 'trash',
          'is-live': trashHasItems && active !== 'trash',
          'is-drop': dropSlot === 'trash',
        }"
        @click="emit('openTrash')"
        @dragover="onOver('trash', $event)"
        @dragleave="emit('slotLeave', 'trash')"
        @drop.prevent="emit('dropTrash')"
      >{{ t('drive.trash') }}</button>
    </nav>
    <div class="drive-side__store">
      <p>{{ t('drive.storageUsed') }}</p>
      <p class="drive-side__store-num font-natto">{{ usedLabel }} <span>/ 100 GB</span></p>
      <div class="drive-side__bar"><i :style="{ width: usedPct + '%' }" /></div>
      <p>{{ t('drive.storageLoad') }}: {{ usedPct < 80 ? t('drive.optimal') : t('drive.high') }}</p>
    </div>
    <div class="drive-side__links">
      <router-link to="/drive/settings">{{ t('drive.settings') }}</router-link>
      <router-link to="/admin/invitations">{{ t('drive.invite') }}</router-link>
      <button type="button" @click="emit('logout')">{{ t('drive.signOut') }}</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDriveFiles } from '@/composables/useDriveFiles'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { useTransferStore } from '@/stores/transfers'
import { formatBytes } from '@/utils/formatFile'
import { trashItemCount } from '@/utils/recycleBin'

export type DriveSideChannel = 'mine' | 'public' | 'root' | 'trash' | 'transfers'

const props = withDefaults(
  defineProps<{
    active: DriveSideChannel
    dropSlot?: string
    enableDrop?: boolean
  }>(),
  {
    dropSlot: '',
    enableDrop: false,
  },
)

const emit = defineEmits<{
  openMine: []
  openPublic: []
  openRoot: []
  openTrash: []
  noteOffline: [label: string]
  logout: []
  slotOver: [slot: string, event: DragEvent]
  slotLeave: [slot: string]
  dropMine: []
  dropPublic: []
  dropTrash: []
}>()

const { t } = useI18n()
const auth = useAuthStore()
const transfers = useTransferStore()
const { roots, usedBytes } = useDriveFiles()
const CAP_GB = 100

const transferCount = computed(() => transfers.activeCount)
const trashHasItems = computed(() => {
  if (!auth.user) {
    return false
  }
  const room = roots.value.find((node) => node.fileName === String(auth.user?.userId)) ?? null
  return trashItemCount(room) > 0
})

const usedLabel = computed(() =>
  usedBytes.value > 0 ? formatBytes(usedBytes.value) : '0 B',
)
const usedPct = computed(() =>
  Math.min(100, (usedBytes.value / (CAP_GB * 1024 * 1024 * 1024)) * 100),
)

function onOver(slot: string, event: DragEvent) {
  if (!props.enableDrop) {
    return
  }
  emit('slotOver', slot, event)
}
</script>

<style scoped>
.drive-side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 0;
  overflow: auto;
  padding: 1.25rem 1rem 1.25rem 1.4rem;
  border-right: 1px solid var(--arc-line);
}

.drive-side__brand {
  margin: 0;
  font-family: var(--arc-display);
  letter-spacing: 0.12em;
  font-size: 0.85rem;
}

.drive-side__nav,
.drive-side__links {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.drive-side__nav :is(button, a),
.drive-side__links :is(a, button) {
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

.drive-side__nav :is(button, a).is-on,
.drive-side__nav :is(button, a).is-live,
.drive-side__nav :is(button, a).is-drop {
  color: var(--arc-lime);
}

.drive-side__nav :is(button, a).is-live {
  opacity: 0.85;
}

.drive-side__nav :is(button, a).is-drop {
  outline: 1px dashed var(--arc-lime);
  outline-offset: 2px;
}

.drive-side__nav :is(button, a).is-off {
  opacity: 0.45;
}

.drive-side__store {
  margin-top: auto;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgb(235 244 246 / 55%);
}

.drive-side__store-num {
  margin: 0.35rem 0;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: var(--arc-ink);
}

.drive-side__store-num span {
  font-size: 0.7rem;
  color: rgb(235 244 246 / 45%);
}

.drive-side__bar {
  height: 2px;
  margin: 0.4rem 0 0.6rem;
  background: rgb(235 244 246 / 16%);
}

.drive-side__bar i {
  display: block;
  height: 100%;
  background: var(--arc-lime);
}

.drive-side::-webkit-scrollbar {
  width: 4px;
}

.drive-side::-webkit-scrollbar-thumb {
  background: rgb(235 244 246 / 18%);
}

@media (max-width: 720px) {
  .drive-side {
    border-right: 0;
    border-bottom: 1px solid var(--arc-line);
  }

  .drive-side__nav {
    flex-flow: row wrap;
  }
}
</style>
