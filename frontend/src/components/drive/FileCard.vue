<template>
  <button
    type="button"
    class="card"
    :class="{ 'is-on': selected }"
    @click="$emit('select')"
    @dblclick="$emit('open')"
    @contextmenu.prevent="$emit('menu', $event)"
    @mouseenter="$emit('hover')"
  >
    <div class="card__stage">
      <CyanotypeMedia
        v-if="showThumb"
        :src="previewSrc"
        :alt="item.fileName"
      />
      <div v-else class="card__glyph" :data-kind="kind">
        <svg v-if="kind === 'folder'" class="card__folder" viewBox="0 0 72 52" aria-hidden="true">
          <path d="M2 14h20l7 7h41v27H2z" />
          <path d="M2 21h68v27H2z" />
          <path d="M10 29h20M10 35h12" />
        </svg>
        <span v-else-if="kind === 'image'">▣ IMG</span>
        <span v-else-if="kind === 'video'" class="card__play-glyph">▶</span>
        <span v-else-if="kind === 'pdf'">▤ PDF</span>
        <span v-else-if="kind === 'document'">☰ DOC</span>
        <span v-else-if="kind === 'archive'">⧉ ZIP</span>
        <span v-else>▯ FILE</span>
      </div>
      <span v-if="kind === 'video'" class="card__play">PLAY</span>
      <span v-if="selected" class="card__mark">▣</span>
    </div>
    <div class="card__meta">
      <span class="card__name">{{ displayName }}</span>
      <span class="card__size">{{ sizeText }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FilesVO } from '@/types/file'
import { kindOf, type FileKind } from '@/utils/fileKind'
import { formatBytes } from '@/utils/formatFile'
import { archivalDisplayName } from '@/utils/text'
import CyanotypeMedia from './CyanotypeMedia.vue'

const props = defineProps<{
  item: FilesVO
  selected: boolean
  previewSrc?: string | null
  label: string
  thumbs?: boolean
}>()

defineEmits<{
  select: []
  open: []
  hover: []
  menu: [event: MouseEvent]
}>()

const kind = computed<FileKind>(() => kindOf(props.item))
const showThumb = computed(
  () => Boolean(props.thumbs && props.previewSrc && (kind.value === 'image' || kind.value === 'video')),
)
const displayName = computed(() => archivalDisplayName(props.label))
const sizeText = computed(() => (props.item.isFile ? formatBytes(props.item.length) : 'DIR'))
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--arc-line);
  border-radius: 0;
  background: var(--arc-card);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 300ms ease,
    color 300ms ease;
}

.card:hover,
.card.is-on {
  border-color: var(--arc-lime);
}

.card:hover .card__name,
.card.is-on .card__name {
  color: var(--arc-lime);
}

.card:hover .card__stage,
.card.is-on .card__stage {
  transform: scale(1.015);
}

.card:hover .card__folder,
.card.is-on .card__folder {
  stroke: var(--arc-lime);
}

.card__stage {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #07151e;
  transform: scale(1);
  transform-origin: center;
  transition: transform 300ms ease;
}

.card__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--arc-chem);
  background:
    linear-gradient(180deg, #0a2a3c 0%, #06131b 100%);
}

.card__folder {
  width: 3.2rem;
  height: auto;
  fill: none;
  stroke: var(--arc-chem);
  stroke-width: 1.2;
  transition: stroke 300ms ease;
}

.card__play-glyph {
  font-size: 1.4rem;
  letter-spacing: 0;
}

.card__play,
.card__mark {
  position: absolute;
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--arc-lime);
}

.card__play {
  right: 0.4rem;
  bottom: 0.4rem;
}

.card__mark {
  top: 0.35rem;
  right: 0.4rem;
}

.card__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.5rem;
  font-size: 10px;
  letter-spacing: 0.04em;
}

.card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(235 244 246 / 82%);
  transition: color 300ms ease;
}

.card__size {
  flex-shrink: 0;
  color: rgb(235 244 246 / 40%);
}
</style>
