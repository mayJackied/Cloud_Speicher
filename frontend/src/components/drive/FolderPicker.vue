<template>
  <div class="pick" @click.stop @mousedown.stop>
    <p class="pick__title">{{ t('drive.moveTitle') }}</p>
    <p class="pick__path">{{ pathLabel }}</p>
    <div class="pick__roots">
      <button
        v-for="root in startRoots"
        :key="root.fileName"
        type="button"
        :class="{ 'is-on': crumbs[0] === root.fileName }"
        @click="openRoot(root.fileName)"
      >
        {{ rootLabel(root.fileName) }}
      </button>
    </div>
    <div class="pick__bar">
      <button type="button" :disabled="crumbs.length <= 1" @click="goUp">{{ t('drive.upFolder') }}</button>
    </div>
    <ul class="pick__list">
      <li v-if="folders.length === 0">{{ t('drive.noFolders') }}</li>
      <li v-for="folder in folders" :key="folder.fileName">
        <button type="button" @click="enter(folder)">{{ archivalDisplayName(folder.fileName) }}</button>
      </li>
    </ul>
    <p v-if="blocked" class="pick__warn">{{ t('drive.cannotMoveHere') }}</p>
    <div class="pick__actions">
      <button type="button" :disabled="blocked || samePlace || busy" @click="confirm">{{ busy ? t('drive.loading') : t('drive.moveHere') }}</button>
      <button type="button" :disabled="busy" @click="$emit('cancel')">{{ t('drive.abort') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import type { FilesVO } from '@/types/file'
import { childrenOf, toServerPath } from '@/types/file'
import { canWriteInFolder } from '@/utils/driveAccess'
import { isForbiddenMoveDest, isSameFolder } from '@/utils/moveDest'
import { archivalDisplayName } from '@/utils/text'

const props = defineProps<{
  roots: FilesVO[]
  moving: FilesVO
  sourceCrumbs: string[]
  busy?: boolean
}>()

const emit = defineEmits<{
  confirm: [targetDir: string]
  cancel: []
}>()

const { t } = useI18n()
const auth = useAuthStore()
const crumbs = ref<string[]>([...props.sourceCrumbs])

const accessOf = (path: string[]) => ({
  crumbs: path,
  userId: auth.user?.userId,
  isAdmin: auth.isAdmin,
})

const startRoots = computed(() =>
  props.roots.filter((node) => !node.isFile && canWriteInFolder(accessOf([node.fileName]))),
)

function rootLabel(name: string) {
  if (name === 'public') {
    return t('drive.public')
  }
  if (auth.user && name === String(auth.user.userId)) {
    return t('drive.myDrive')
  }
  return archivalDisplayName(name)
}

function nodeAt(path: string[]): FilesVO | null {
  let nodes = props.roots
  let current: FilesVO | null = null
  for (const name of path) {
    current = nodes.find((node) => node.fileName === name && !node.isFile) ?? null
    if (!current) {
      return null
    }
    nodes = childrenOf(current)
  }
  return current
}

const folders = computed(() => {
  const current = nodeAt(crumbs.value)
  const kids = current ? childrenOf(current) : []
  return kids.filter((node) => {
    if (node.isFile) {
      return false
    }
    return !(
      !props.moving.isFile &&
      node.fileName === props.moving.fileName &&
      isSameFolder(crumbs.value, props.sourceCrumbs)
    )
  })
})

const blocked = computed(
  () =>
    !canWriteInFolder(accessOf(crumbs.value)) ||
    isForbiddenMoveDest(crumbs.value, props.sourceCrumbs, props.moving.fileName, props.moving.isFile),
)

const samePlace = computed(() => isSameFolder(crumbs.value, props.sourceCrumbs))

const pathLabel = computed(() =>
  crumbs.value.map((name) => rootLabel(name)).join(' / ') || t('drive.root'),
)

function openRoot(name: string) {
  crumbs.value = [name]
}

function goUp() {
  if (crumbs.value.length > 1) {
    crumbs.value = crumbs.value.slice(0, -1)
  }
}

function enter(folder: FilesVO) {
  crumbs.value = [...crumbs.value, folder.fileName]
}

function confirm() {
  if (blocked.value || samePlace.value || props.busy) {
    return
  }
  emit('confirm', toServerPath(crumbs.value))
}
</script>

<style scoped>
.pick {
  width: min(32rem, 92vw);
  padding: 1rem;
  border: 1px solid var(--arc-line);
  background: #081923;
}

.pick__title,
.pick__path,
.pick__warn {
  margin: 0 0 0.6rem;
  font-size: 11px;
  letter-spacing: 0.1em;
}

.pick__path,
.pick__warn {
  color: var(--arc-chem);
}

.pick__roots,
.pick__bar,
.pick__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 0.7rem;
}

.pick button {
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--arc-line);
  background: transparent;
  color: var(--arc-ink);
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.pick button.is-on,
.pick button:hover:not(:disabled) {
  border-color: var(--arc-lime);
  color: var(--arc-lime);
}

.pick button:disabled {
  opacity: 0.4;
  cursor: default;
}

.pick__list {
  max-height: 14rem;
  margin: 0 0 0.8rem;
  padding: 0;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--arc-line);
}

.pick__list li {
  border-bottom: 1px solid var(--arc-line);
}

.pick__list li:last-child {
  border-bottom: 0;
}

.pick__list button {
  width: 100%;
  border: 0;
  text-align: left;
}
</style>
