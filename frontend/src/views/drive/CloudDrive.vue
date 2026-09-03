<template>
  <ArchiveFrame fill :clock="false">
    <div class="arc">
    <aside class="arc__side">
      <p class="arc__brand">ARCHIVAL_CLOUD</p>
      <nav class="arc__nav">
        <button
          type="button"
          :class="{ 'is-on': channel === 'mine', 'is-drop': dropSlot === 'mine' }"
          @click="openMine"
          @dragover="onSlotOver('mine', $event)"
          @dragleave="onSlotLeave('mine')"
          @drop.prevent="onDropMine"
        >{{ t('drive.myDrive') }}</button>
        <button
          type="button"
          :class="{ 'is-on': channel === 'public', 'is-drop': dropSlot === 'public' }"
          @click="openPublic"
          @dragover="onSlotOver('public', $event)"
          @dragleave="onSlotLeave('public')"
          @drop.prevent="onDropPublic"
        >{{ t('drive.public') }}</button>
        <button type="button" :class="{ 'is-on': channel === 'root' }" @click="openRoot">{{ t('drive.root') }}</button>
        <button type="button" class="is-off" @click="noteOffline(t('drive.recent'))">{{ t('drive.recent') }}</button>
        <button type="button" class="is-off" @click="noteOffline(t('drive.starred'))">{{ t('drive.starred') }}</button>
        <button type="button" class="is-off" @click="noteOffline(t('drive.shared'))">{{ t('drive.shared') }}</button>
        <button
          type="button"
          class="is-off"
          :class="{ 'is-drop': dropSlot === 'trash' }"
          @click="noteOffline(t('drive.trash'))"
          @dragover="onSlotOver('trash', $event)"
          @dragleave="onSlotLeave('trash')"
          @drop.prevent="onDropTrash"
        >{{ t('drive.trash') }}</button>
      </nav>
      <div class="arc__store">
        <p>{{ t('drive.storageUsed') }}</p>
        <p class="arc__store-num font-natto">{{ usedLabel }} <span>/ 100 GB</span></p>
        <div class="arc__bar"><i :style="{ width: usedPct + '%' }" /></div>
        <p>{{ t('drive.storageLoad') }}: {{ usedPct < 80 ? t('drive.optimal') : t('drive.high') }}</p>
      </div>
      <div class="arc__side-links">
        <router-link to="/drive/settings">{{ t('drive.settings') }}</router-link>
        <router-link to="/admin/invitations">{{ t('drive.invite') }}</router-link>
        <button type="button" @click="onLogout">{{ t('drive.signOut') }}</button>
      </div>
    </aside>

    <div class="arc__body">
      <header class="arc__head">
        <div>
          <p class="arc__kicker">ARCHIVAL_CLOUD_SYSTEM</p>
          <h1 class="arc__title">
            <button type="button" @click="openRoot">MY_ARCHIVE</button>
            <template v-for="(name, index) in crumbs" :key="`${index}-${name}`">
              <span>//</span>
              <button
                type="button"
                :class="{ 'is-drop': dropSlot === `crumb:${index}` }"
                @click="jumpTo(index)"
                @dragover="onSlotOver(`crumb:${index}`, $event)"
                @dragleave="onSlotLeave(`crumb:${index}`)"
                @drop.prevent="onDropCrumb(index)"
              >{{ crumbLabel(name) }}</button>
            </template>
          </h1>
        </div>
        <div class="arc__head-end">
          <Timeboard />
          <div class="arc__status">
            <span class="arc__stat">
              <em>{{ t('drive.storageUsed') }}</em>
              <strong class="arc__stat-num">{{ usedLabel }} / 100 GB</strong>
            </span>
            <span class="arc__stat">
              <em>{{ t('drive.sync') }}</em>
              <strong :class="syncClass">{{ syncLabel }}</strong>
            </span>
            <span class="arc__pill" :class="pillClass">[{{ pillLabel }}]</span>
          </div>
        </div>
      </header>

      <div class="arc__tools">
        <input
          v-model="query"
          class="arc__search"
          type="search"
          :placeholder="t('drive.search')"
          spellcheck="false"
        />
        <div class="arc__sort" @mousedown.stop>
          <button type="button" class="arc__select-btn" @click="sortOpen = !sortOpen">
            {{ sortLabel }}
          </button>
          <div v-if="sortOpen" class="arc__sort-menu">
            <button
              v-for="opt in sortOptions"
              :key="opt.value"
              type="button"
              :class="{ 'is-on': sortKey === opt.value }"
              @click="chooseSort(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <button type="button" :class="{ 'is-on': view === 'grid' }" @click="view = 'grid'">{{ t('drive.grid') }}</button>
        <button type="button" :class="{ 'is-on': view === 'list' }" @click="view = 'list'">{{ t('drive.list') }}</button>
        <button v-if="canWrite && !atRoot" type="button" class="arc__cta" @click="openCreate">{{ t('drive.create') }}</button>
        <button v-if="canWrite && !atRoot" type="button" class="arc__cta" @click="pickUpload">{{ t('drive.upload') }}</button>
        <input ref="fileInput" class="arc__hidden" type="file" @change="onFileInput" />
      </div>

      <p class="arc__sel" :class="{ 'is-idle': !selected }">
        <span class="arc__sel-count">{{ selected ? t('drive.selected') : t('drive.selectedNone') }}</span>
        <button type="button" :disabled="!canActDownload" @click="selected && downloadItem(selected)">{{ t('drive.download') }}</button>
        <button type="button" :disabled="!canActWrite" @click="openRename">{{ t('drive.rename') }}</button>
        <button type="button" :disabled="!canActWrite" @click="openMove">{{ t('drive.move') }}</button>
        <button type="button" :disabled="!canActWrite" @click="confirmDelete">{{ t('drive.delete') }}</button>
        <button type="button" :disabled="!canActMeta" @click="noteOffline(t('drive.share'))">{{ t('drive.share') }}</button>
        <button type="button" :disabled="!canActMeta" @click="noteOffline(t('drive.star'))">{{ t('drive.star') }}</button>
        <span v-if="selNote" class="arc__sel-note">{{ selNote }}</span>
      </p>

      <div class="arc__workspace">
        <section
          class="arc__browser"
          :class="{ 'is-busy': busy, 'is-expose': exposing }"
          @click.self="selected = null"
          @dragenter="onBrowserDragEnter"
          @dragover="onBrowserDragOver"
          @dragleave="onBrowserDragLeave"
          @drop.prevent="onBrowserDrop"
        >
          <div v-if="exposing" class="arc__expose" aria-hidden="true">
            <p class="arc__expose-kicker">{{ t('drive.dropExpose') }}</p>
            <p>{{ t('drive.dropExposeHint') }}</p>
            <i class="arc__expose-scan" />
          </div>
          <p v-if="loading && roots.length === 0" class="arc__empty">{{ t('drive.loading') }}</p>
          <ConcreteVoid v-else-if="visibleItems.length === 0" :kind="searching ? 'search' : 'empty'" />
          <div v-else-if="view === 'grid'" class="arc__grid-view">
            <FileCard
              v-for="item in visibleItems"
              :key="item.fileName"
              :item="item"
              :label="labelOf(item.fileName)"
              :selected="selected?.fileName === item.fileName"
              :preview-src="previews[item.fileName]"
              :thumbs="prefs.thumbnails"
              :draggable="canDragItems"
              :droppable="canDropInto(item)"
              @select="select(item)"
              @open="openItem(item)"
              @hover="void warmPreview(item)"
              @menu="(event) => openMenu(event, item)"
              @dragstart="onItemDragStart(item)"
              @dragend="onItemDragEnd"
              @dropin="onDropIntoFolder(item)"
            />
            <button
              v-if="canWrite && !atRoot"
              type="button"
              class="arc__append"
              @click="pickUpload"
            >
              <span>+</span>
              {{ t('drive.append') }}
            </button>
          </div>
          <table v-else class="arc__list">
            <thead>
              <tr>
                <th>{{ t('drive.name') }}</th>
                <th>{{ t('drive.type') }}</th>
                <th>{{ t('drive.size') }}</th>
                <th>{{ t('drive.modified') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in visibleItems"
                :key="item.fileName"
                :class="{ 'is-on': selected?.fileName === item.fileName, 'is-drop': canDropInto(item) }"
                :draggable="canDragItems"
                @click="select(item)"
                @dblclick="openItem(item)"
                @contextmenu.prevent="openMenu($event, item)"
                @dragstart="onItemDragStart(item)"
                @dragend="onItemDragEnd"
                @dragover="canDropInto(item) && onSlotOver(`folder:${item.fileName}`, $event)"
                @drop.prevent="onDropIntoFolder(item)"
              >
                <td>{{ archivalDisplayName(labelOf(item.fileName)) }}</td>
                <td>{{ typeLabel(kindOf(item), item.fileName) }}</td>
                <td>{{ formatBytes(bytesOfNode(item)) }}</td>
                <td>{{ formatStamp(item.lastModified) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <aside class="arc__preview">
          <div class="arc__preview-head">
            <span>{{ t('drive.preview') }}</span>
            <button v-if="selected && kindOf(selected) === 'image'" type="button" @click="reveal = !reveal">
              {{ reveal ? t('drive.cyanotype') : t('drive.reveal') }}
            </button>
          </div>
          <template v-if="selected">
            <div class="arc__frame">
              <CyanotypeMedia
                v-if="kindOf(selected) === 'image'"
                :src="previews[selected.fileName]"
                :alt="selected.fileName"
                :force-reveal="reveal"
                :hover-reveal="false"
              />
              <div v-else class="arc__frame-void">
                {{ typeLabel(kindOf(selected), selected.fileName) }}
              </div>
            </div>
            <dl class="arc__meta">
              <div><dt>{{ t('drive.name') }}</dt><dd>{{ archivalDisplayName(selected.fileName) }}</dd></div>
              <div><dt>{{ t('drive.type') }}</dt><dd>{{ typeLabel(kindOf(selected), selected.fileName) }}</dd></div>
              <div><dt>{{ t('drive.size') }}</dt><dd>{{ formatBytes(bytesOfNode(selected)) }}</dd></div>
              <div><dt>{{ t('drive.modified') }}</dt><dd>{{ formatStamp(selected.lastModified) }}</dd></div>
              <div><dt>{{ t('drive.location') }}</dt><dd>{{ locationLabel }}</dd></div>
              <div><dt>{{ t('drive.sync') }}</dt><dd>{{ syncLabel }}</dd></div>
            </dl>
          </template>
          <p v-else class="arc__empty">{{ t('drive.noFile') }}</p>
        </aside>
      </div>
    </div>
    </div>

    <div v-if="menu" class="arc__menu" :style="{ left: menu.x + 'px', top: menu.y + 'px' }" @mousedown.stop>
      <button type="button" @click="openItem(menu.item); menu = null">{{ t('drive.open') }}</button>
      <button v-if="menu.item.isFile && canDownload" type="button" @click="downloadItem(menu.item); menu = null">
        {{ t('drive.download') }}
      </button>
      <button v-if="canWrite && !atRoot" type="button" @click="openRename(); menu = null">{{ t('drive.rename') }}</button>
      <button v-if="canWrite && !atRoot" type="button" @click="openMove(); menu = null">{{ t('drive.move') }}</button>
      <button v-if="canWrite && !atRoot" type="button" @click="confirmDelete(); menu = null">{{ t('drive.delete') }}</button>
      <button type="button" @click="noteOffline(t('drive.share')); menu = null">{{ t('drive.share') }}</button>
      <button type="button" @click="noteOffline(t('drive.star')); menu = null">{{ t('drive.star') }}</button>
    </div>

    <div v-if="moveOpen && selected" class="arc__modal" @click.self="closeMove">
      <FolderPicker
        :roots="roots"
        :moving="selected"
        :source-crumbs="crumbs"
        :busy="busy"
        @confirm="onMoveConfirm"
        @cancel="closeMove"
      />
    </div>

    <div v-if="dialog" class="arc__modal" @click.self="dialog = null">
      <form class="arc__dialog" @submit.prevent="submitDialog">
        <p>{{ dialog.title }}</p>
        <input v-if="dialog.field" v-model="dialog.value" class="arc__search" />
        <p v-else>{{ t('drive.confirmOp') }}</p>
        <div class="arc__actions">
          <button type="submit">{{ t('drive.commit') }}</button>
          <button type="button" @click="dialog = null">{{ t('drive.abort') }}</button>
        </div>
      </form>
    </div>
  </ArchiveFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { usePrefsStore } from '@/stores/prefs'
import { useApiLink } from '@/composables/useApiLink'
import { useDriveFiles } from '@/composables/useDriveFiles'
import { useI18n } from '@/composables/useI18n'
import { bytesOfNode, toServerPath, type FilesVO } from '@/types/file'
import { ErrorCode, messageForCode } from '@/types/errorCode'
import { kindOf, needsPosterFrame, typeLabel } from '@/utils/fileKind'
import { formatBytes, formatStamp } from '@/utils/formatFile'
import { stillFromBlob } from '@/utils/posterFrame'
import { archivalDisplayName, decodeFileName } from '@/utils/text'
import { canWriteInFolder } from '@/utils/driveAccess'
import { isFileDrag, isForbiddenMoveDest, isSameFolder } from '@/utils/moveDest'
import FileCard from '@/components/drive/FileCard.vue'
import CyanotypeMedia from '@/components/drive/CyanotypeMedia.vue'
import ArchiveFrame from '@/components/drive/ArchiveFrame.vue'
import FolderPicker from '@/components/drive/FolderPicker.vue'
import Timeboard from '@/components/drive/Timeboard.vue'
import ConcreteVoid from '@/components/drive/ConcreteVoid.vue'

type Channel = 'mine' | 'public' | 'root'
type SortKey = 'name' | 'type' | 'size' | 'time'
type DialogState = { title: string; field: boolean; value: string; kind: 'create' | 'rename' | 'delete' }

const { t, locale } = useI18n()
const { status: linkStatus, syncLabel, pillLabel } = useApiLink()
const syncClass = computed(() => {
  if (linkStatus.value === 'online') {
    return 'is-lime'
  }
  if (linkStatus.value === 'unreachable') {
    return 'is-warn'
  }
  return 'is-mute'
})
const pillClass = computed(() => {
  if (linkStatus.value === 'online') {
    return 'is-up'
  }
  if (linkStatus.value === 'unreachable') {
    return 'is-down'
  }
  if (linkStatus.value === 'checking') {
    return 'is-wait'
  }
  return 'is-local'
})
const sortOptions = computed(() => [
  { value: 'name' as const, label: t('drive.sortName') },
  { value: 'type' as const, label: t('drive.sortType') },
  { value: 'size' as const, label: t('drive.sortSize') },
  { value: 'time' as const, label: t('drive.sortModified') },
])

const CAP_GB = 100
const auth = useAuthStore()
const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const searching = computed(() => query.value.trim().length > 0)
const sortKey = ref<SortKey>('name')
const sortOpen = ref(false)
const view = ref<'grid' | 'list'>('grid')
const selected = ref<FilesVO | null>(null)
const reveal = ref(true)
const exposing = ref(false)
const dragNode = ref<FilesVO | null>(null)
const dropSlot = ref('')
const offlineNote = ref('')
const channel = ref<Channel>('root')
const previews = reactive<Record<string, string>>({})
const menu = ref<{ x: number; y: number; item: FilesVO } | null>(null)
const dialog = ref<DialogState | null>(null)
const moveOpen = ref(false)
const prefs = usePrefsStore()

const {
  roots,
  crumbs,
  loading,
  busy,
  message,
  currentItems,
  canWrite,
  canDownload,
  atRoot,
  labelOf,
  load,
  enter,
  goRoot,
  goTo,
  createFolder,
  renameItem,
  removeItem,
  uploadPicked,
  downloadItem,
  moveItem,
  blobForItem,
  usedBytes,
  goInto,
} = useDriveFiles()

const usedLabel = computed(() => (usedBytes.value > 0 ? formatBytes(usedBytes.value) : '0 B'))
const usedPct = computed(() => Math.min(100, (usedBytes.value / (CAP_GB * 1024 * 1024 * 1024)) * 100))
const sortLabel = computed(
  () => sortOptions.value.find((opt) => opt.value === sortKey.value)?.label ?? t('drive.sortName'),
)
const canActDownload = computed(() => Boolean(selected.value?.isFile && canDownload.value))
const canActWrite = computed(() => Boolean(selected.value && canWrite.value && !atRoot.value))
const canActMeta = computed(() => Boolean(selected.value))
const canDragItems = computed(() => canWrite.value && !atRoot.value)
const selNote = computed(
  () => message.value || offlineNote.value || (loading.value || busy.value ? t('drive.loading') : ''),
)

const locationLabel = computed(() => {
  if (crumbs.value.length === 0) {
    return t('drive.root')
  }
  return crumbs.value.map((name) => crumbLabel(name)).join(' / ')
})

const visibleItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  let items = currentItems.value
  if (q) {
    items = items.filter((item) => {
      const raw = item.fileName.toLowerCase()
      const decoded = decodeFileName(item.fileName).toLowerCase()
      const shown = archivalDisplayName(labelOf(item.fileName)).toLowerCase()
      return raw.includes(q) || decoded.includes(q) || shown.includes(q)
    })
  }
  const copy = [...items]
  copy.sort((a, b) => {
    if (sortKey.value === 'size') {
      return (a.length || 0) - (b.length || 0)
    }
    if (sortKey.value === 'time') {
      return (a.lastModified || 0) - (b.lastModified || 0)
    }
    if (sortKey.value === 'type') {
      return typeLabel(kindOf(a), a.fileName).localeCompare(typeLabel(kindOf(b), b.fileName))
    }
    return archivalDisplayName(labelOf(a.fileName)).localeCompare(
      archivalDisplayName(labelOf(b.fileName)),
      locale.value,
    )
  })
  return copy
})

function crumbLabel(name: string) {
  if (name === 'public') {
    return t('drive.public')
  }
  if (auth.user && name === String(auth.user.userId)) {
    return t('drive.myDrive')
  }
  return archivalDisplayName(name)
}

function syncChannel() {
  const top = crumbs.value[0]
  if (!top) {
    channel.value = 'root'
    return
  }
  if (top === 'public') {
    channel.value = 'public'
    return
  }
  if (auth.user && top === String(auth.user.userId)) {
    channel.value = 'mine'
    return
  }
  channel.value = 'root'
}

function openMine() {
  if (!auth.user) {
    return
  }
  goInto(String(auth.user.userId))
  selected.value = null
  syncChannel()
}

function openPublic() {
  goInto('public')
  selected.value = null
  syncChannel()
}

function openRoot() {
  goRoot()
  selected.value = null
  syncChannel()
}

function jumpTo(index: number) {
  goTo(index)
  selected.value = null
  syncChannel()
}

function chooseSort(key: SortKey) {
  sortKey.value = key
  sortOpen.value = false
}

function noteOffline(name: string) {
  offlineNote.value = `${name}: ${t('drive.unavailable')}`
}

function select(item: FilesVO) {
  selected.value = item
  reveal.value = true
  menu.value = null
  void warmPreview(item)
}

function openItem(item: FilesVO) {
  if (!item.isFile) {
    enter(item)
    selected.value = null
    syncChannel()
    return
  }
  select(item)
}

function openMenu(event: MouseEvent, item: FilesVO) {
  selected.value = item
  menu.value = { x: event.clientX, y: event.clientY, item }
}

async function warmPreview(item: FilesVO) {
  if (!prefs.thumbnails || previews[item.fileName]) {
    return
  }
  const kind = kindOf(item)
  if (kind !== 'image' && kind !== 'video') {
    return
  }
  try {
    const blob = await blobForItem(item)
    if (!blob) {
      return
    }
    if (needsPosterFrame(item)) {
      try {
        const still = await stillFromBlob(blob, kind === 'video' ? 'video' : 'image')
        previews[item.fileName] = URL.createObjectURL(still)
      } catch {
        /* 抽帧失败则保持 glyph，避免 GIF/视频在网格里播起来 */
      }
      return
    }
    previews[item.fileName] = URL.createObjectURL(blob)
  } catch {
    /* hover preview is best-effort */
  }
}

watch(
  [visibleItems, () => prefs.thumbnails],
  () => {
    if (!prefs.thumbnails) {
      return
    }
    let n = 0
    for (const item of visibleItems.value) {
      const kind = kindOf(item)
      if (kind !== 'image' && kind !== 'video') {
        continue
      }
      void warmPreview(item)
      n += 1
      if (n >= 24) {
        break
      }
    }
  },
)

function pickUpload() {
  fileInput.value?.click()
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  void uploadPicked(input.files?.[0])
  input.value = ''
}

function canDropInto(item: FilesVO): boolean {
  return Boolean(dragNode.value && !item.isFile && dragNode.value.fileName !== item.fileName)
}

function onItemDragStart(item: FilesVO) {
  dragNode.value = item
  selected.value = item
  exposing.value = false
}

function onItemDragEnd() {
  dragNode.value = null
  dropSlot.value = ''
}

function onSlotOver(slot: string, event: DragEvent) {
  if (!dragNode.value || isFileDrag(event)) {
    return
  }
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dropSlot.value = slot
}

function onSlotLeave(slot: string) {
  if (dropSlot.value === slot) {
    dropSlot.value = ''
  }
}

function destAccess(dest: string[]) {
  return {
    crumbs: dest,
    userId: auth.user?.userId,
    isAdmin: auth.isAdmin,
  }
}

async function dropMoveTo(dest: string[]) {
  const item = dragNode.value
  dropSlot.value = ''
  if (!item || !canDragItems.value) {
    return
  }
  if (isSameFolder(dest, crumbs.value)) {
    return
  }
  if (isForbiddenMoveDest(dest, crumbs.value, item.fileName, item.isFile)) {
    message.value = t('drive.cannotMoveHere')
    return
  }
  if (!canWriteInFolder(destAccess(dest))) {
    message.value = messageForCode(ErrorCode.NO_PERMISSION)
    return
  }
  await moveItem(item, toServerPath(dest))
  if (!message.value) {
    selected.value = null
  }
}

function onDropMine() {
  if (!auth.user) {
    return
  }
  void dropMoveTo([String(auth.user.userId)])
}

function onDropPublic() {
  void dropMoveTo(['public'])
}

function onDropCrumb(index: number) {
  void dropMoveTo(crumbs.value.slice(0, index + 1))
}

function onDropIntoFolder(item: FilesVO) {
  if (!canDropInto(item)) {
    return
  }
  void dropMoveTo([...crumbs.value, item.fileName])
}

function onDropTrash() {
  dropSlot.value = ''
  if (dragNode.value) {
    noteOffline(t('drive.trash'))
  }
}

function onBrowserDragEnter(event: DragEvent) {
  if (dragNode.value || !isFileDrag(event) || !canWrite.value || atRoot.value) {
    return
  }
  event.preventDefault()
  exposing.value = true
}

function onBrowserDragOver(event: DragEvent) {
  if (dragNode.value || !isFileDrag(event) || !canWrite.value || atRoot.value) {
    return
  }
  event.preventDefault()
  exposing.value = true
}

function onBrowserDragLeave(event: DragEvent) {
  const node = event.currentTarget
  if (node instanceof Element && !node.contains(event.relatedTarget as Node | null)) {
    exposing.value = false
  }
}

async function onBrowserDrop(event: DragEvent) {
  exposing.value = false
  if (dragNode.value || !isFileDrag(event)) {
    return
  }
  const files = Array.from(event.dataTransfer?.files ?? [])
  for (const file of files) {
    await uploadPicked(file)
  }
}

function openCreate() {
  dialog.value = { title: t('drive.createTitle'), field: true, value: '', kind: 'create' }
}

function openRename() {
  if (!selected.value) {
    return
  }
  dialog.value = {
    title: t('drive.renameTitle'),
    field: true,
    value: decodeFileName(selected.value.fileName),
    kind: 'rename',
  }
}

function openMove() {
  if (!selected.value || atRoot.value || !canWrite.value) {
    return
  }
  moveOpen.value = true
}

function closeMove() {
  if (!busy.value) {
    moveOpen.value = false
  }
}

async function onMoveConfirm(targetDir: string) {
  const item = selected.value
  if (!item) {
    return
  }
  await moveItem(item, targetDir)
  moveOpen.value = false
  if (!message.value) {
    selected.value = null
  }
}

function confirmDelete() {
  dialog.value = { title: t('drive.deleteTitle'), field: false, value: '', kind: 'delete' }
}

async function submitDialog() {
  const current = dialog.value
  const item = selected.value
  if (!current) {
    return
  }
  if (current.kind === 'create') {
    await createFolder(current.value)
  } else if (current.kind === 'rename' && item) {
    await renameItem(item, current.value)
  } else if (current.kind === 'delete' && item) {
    await removeItem(item)
    selected.value = null
  }
  dialog.value = null
}

async function onLogout() {
  try {
    await logout()
  } catch {
    /* local session still cleared */
  }
  auth.logout()
  await router.push({ name: 'login' })
}

function onKey(event: KeyboardEvent) {
  if (busy.value) {
    return
  }
  if (event.key === 'Escape') {
    selected.value = null
    menu.value = null
    dialog.value = null
    sortOpen.value = false
    moveOpen.value = false
  }
}

function closeMenu() {
  menu.value = null
  sortOpen.value = false
}

onMounted(() => {
  void load().then(() => {
    if (auth.user) {
      openMine()
    }
  })
  window.addEventListener('mousedown', closeMenu)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', closeMenu)
  window.removeEventListener('keydown', onKey)
  Object.values(previews).forEach((url) => URL.revokeObjectURL(url))
})
</script>

<style scoped>
.arc {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 13.5rem minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.arc__side,
.arc__body {
  position: relative;
  z-index: 3;
}

.arc__side {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-height: 0;
  overflow: auto;
  padding: 1.25rem 1rem 1.25rem 1.4rem;
  border-right: 1px solid var(--arc-line);
}

.arc__brand {
  margin: 0;
  font-family: var(--arc-display);
  letter-spacing: 0.12em;
  font-size: 0.85rem;
}

.arc__nav,
.arc__side-links {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.arc__nav button,
.arc__side-links :is(a, button),
.arc__tools > button,
.arc__sel button,
.arc__preview-head button,
.arc__menu button,
.arc__actions button {
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

.arc__nav button.is-on,
.arc__nav button.is-drop,
.arc__title button.is-drop,
.arc__tools > button.is-on {
  color: var(--arc-lime);
}

.arc__nav button.is-drop,
.arc__title button.is-drop {
  outline: 1px dashed var(--arc-lime);
  outline-offset: 2px;
}

.arc__nav button.is-off {
  opacity: 0.45;
}

.arc__store {
  margin-top: auto;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgb(235 244 246 / 55%);
}

.arc__store-num {
  margin: 0.35rem 0;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: var(--arc-ink);
}

.arc__store-num span {
  font-size: 0.7rem;
  color: rgb(235 244 246 / 45%);
}

.arc__bar {
  height: 2px;
  margin: 0.4rem 0 0.6rem;
  background: rgb(235 244 246 / 16%);
}

.arc__bar i {
  display: block;
  height: 100%;
  background: var(--arc-lime);
}

.arc__workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 21rem);
  gap: 1rem;
  align-items: stretch;
}

.arc__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 1rem 1.5rem 1.25rem;
}

.arc__head {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--arc-line);
}

.arc__kicker {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--arc-chem);
}

.arc__title {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.3rem 0 0;
  font-family: var(--arc-display);
  font-size: clamp(1.15rem, 2.4vw, 1.85rem);
  font-weight: 700;
}

.arc__title button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.arc__title span {
  color: var(--arc-chem);
}

.arc__head-end {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.55rem;
  min-width: 18.5rem;
}

.arc__status {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.75rem;
  height: 10px;
  font-family: 'Microsoft YaHei UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1;
  color: rgb(235 244 246 / 55%);
}

.arc__stat,
.arc__pill {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  height: 10px;
  line-height: 1;
}

.arc__stat {
  gap: 0.32rem;
}

.arc__stat em {
  font-style: normal;
}

.arc__stat strong {
  color: var(--arc-ink);
  font-weight: 500;
}

.arc__stat-num {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.arc__pill {
  letter-spacing: 0.08em;
  color: rgb(235 244 246 / 62%);
}

.is-lime {
  color: var(--arc-lime) !important;
}

.is-warn {
  color: #e8a87c !important;
}

.is-mute {
  color: rgb(235 244 246 / 55%) !important;
}

.arc__pill.is-up {
  color: var(--arc-lime);
}

.arc__pill.is-down {
  color: #e8a87c;
}

.arc__pill.is-wait {
  color: var(--arc-chem);
}

.arc__tools {
  display: flex;
  flex-wrap: wrap;
  flex-shrink: 0;
  gap: 0.6rem;
  align-items: center;
  padding: 0.75rem 0;
}

.arc__cta {
  padding: 0.4rem 0.7rem !important;
  border: 1px solid var(--arc-line) !important;
  color: var(--arc-ink) !important;
}

.arc__cta:hover {
  border-color: var(--arc-lime) !important;
  color: var(--arc-lime) !important;
}

.arc__search,
.arc__select,
.arc__select-btn,
.arc__dialog input {
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--arc-line);
  border-radius: 0;
  background: #081923;
  color: var(--arc-ink);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.arc__select-btn {
  cursor: pointer;
}

.arc__sort {
  position: relative;
}

.arc__sort-menu {
  position: absolute;
  z-index: 12;
  top: calc(100% + 1px);
  left: 0;
  min-width: 12.5rem;
  border: 1px solid var(--arc-line);
  background: #081923;
}

.arc__sort-menu button {
  display: block;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 0;
  background: #081923;
  color: var(--arc-ink);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-align: left;
  cursor: pointer;
}

.arc__sort-menu button:hover,
.arc__sort-menu button.is-on {
  color: var(--arc-lime);
}

.arc__hidden {
  display: none;
}

.arc__sel,
.arc__msg,
.arc__empty {
  flex-shrink: 0;
  margin: 0 0 0.6rem;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--arc-chem);
}

.arc__sel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  min-height: 2.1rem;
  color: var(--arc-lime);
}

.arc__sel.is-idle,
.arc__sel.is-idle .arc__sel-count {
  color: rgb(235 244 246 / 45%);
}

.arc__sel button:disabled {
  color: rgb(235 244 246 / 28%);
  cursor: not-allowed;
  pointer-events: none;
}

.arc__sel-note {
  margin-left: auto;
  color: var(--arc-chem);
}

.arc__browser {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0.15rem 0.35rem 0.35rem 0;
}

.arc__browser.is-expose {
  outline: 1px dashed var(--arc-lime);
  outline-offset: -4px;
}

.arc__expose {
  pointer-events: none;
  position: absolute;
  z-index: 6;
  inset: 0.2rem;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.55rem;
  overflow: hidden;
  background:
    radial-gradient(80% 70% at 50% 40%, rgb(12 70 92 / 72%), rgb(6 19 27 / 78%));
  color: var(--arc-lime);
  text-align: center;
}

.arc__expose-kicker {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.18em;
}

.arc__expose p {
  margin: 0;
  color: rgb(235 244 246 / 62%);
  font-size: 11px;
  letter-spacing: 0.14em;
}

.arc__expose-scan {
  position: absolute;
  left: 0;
  right: 0;
  height: 38%;
  background: linear-gradient(180deg, transparent, rgb(183 245 58 / 16%), transparent);
  animation: expose-scan 1.1s linear infinite;
}

@keyframes expose-scan {
  from {
    top: -40%;
  }
  to {
    top: 100%;
  }
}

.arc__browser.is-busy {
  pointer-events: none;
  opacity: 0.55;
}

.arc__browser::-webkit-scrollbar,
.arc__preview::-webkit-scrollbar,
.arc__side::-webkit-scrollbar {
  width: 8px;
}

.arc__browser::-webkit-scrollbar-thumb,
.arc__preview::-webkit-scrollbar-thumb,
.arc__side::-webkit-scrollbar-thumb {
  background: rgb(235 244 246 / 22%);
}

.arc__grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12.5rem, 1fr));
  gap: 0.75rem;
}

.arc__append {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 9.4rem;
  border: 1px dashed var(--arc-line);
  background: transparent;
  color: rgb(235 244 246 / 40%);
  font: inherit;
  font-size: 10px;
  letter-spacing: 0.16em;
  cursor: pointer;
}

.arc__append span {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 1.6rem;
  line-height: 1;
  letter-spacing: 0;
}

.arc__append:hover {
  color: var(--arc-lime);
  border-color: var(--arc-lime);
}

.arc__list {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.arc__list thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--arc-canvas-2);
}

.arc__list th,
.arc__list td {
  padding: 0.45rem 0.4rem;
  border-bottom: 1px solid var(--arc-line);
  text-align: left;
}

.arc__list tr.is-on td,
.arc__list tr.is-drop td {
  color: var(--arc-lime);
}

.arc__preview {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0.75rem;
  border: 1px solid var(--arc-line);
  background: rgb(26 59 78 / 22%);
}

.arc__preview-head {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--arc-chem);
}

.arc__frame {
  flex: 0 1 auto;
  width: 100%;
  aspect-ratio: 1;
  max-height: min(18rem, 42vh);
  overflow: hidden;
  border: 1px solid var(--arc-line);
  background: #07151e;
}

.arc__frame-void {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--arc-chem);
}

.arc__meta {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.1em;
}

.arc__meta div {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 0.4rem;
}

.arc__meta dt {
  color: rgb(235 244 246 / 40%);
}

.arc__meta dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arc__menu {
  position: fixed;
  z-index: 20;
  min-width: 10rem;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--arc-line);
  background: #081923;
}

.arc__menu button {
  display: block;
  width: 100%;
}

.arc__modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgb(6 19 27 / 62%);
}

.arc__dialog {
  width: min(28rem, 90vw);
  padding: 1rem;
  border: 1px solid var(--arc-line);
  background: #081923;
}

.arc__actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.8rem;
}

@media (max-width: 1279px) {
  .arc__grid-view {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .arc {
    grid-template-columns: 1fr;
  }

  .arc__side {
    display: none;
  }

  .arc__workspace {
    grid-template-columns: minmax(0, 1fr) minmax(14rem, 18rem);
  }

  .arc__grid-view {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .arc__workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(10rem, 38%);
  }

  .arc__preview {
    border-top: 1px solid var(--arc-line);
  }

  .arc__frame {
    max-height: 9rem;
    aspect-ratio: auto;
    height: 9rem;
  }
}

@media (max-width: 639px) {
  .arc__grid-view {
    grid-template-columns: 1fr;
  }
}
</style>
