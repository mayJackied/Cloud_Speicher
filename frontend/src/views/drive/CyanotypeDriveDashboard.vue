<template>
  <div class="cya">
    <div class="cya__grid" aria-hidden="true" />
    <p class="cya__verse" aria-hidden="true">
      “The image is not a thing, but a place where the sun met the paper and left its shadow.”
    </p>
    <div class="cya__spine cya__spine--left" aria-hidden="true">
      SOLAR_WASH // DEVELOPMENT // SPEICHER_V04
    </div>
    <div class="cya__spine cya__spine--right" aria-hidden="true">
      EMULSION:FERRIC // STABLE_READY
    </div>

    <header class="cya__header">
      <div>
        <p class="cya__kicker">ARCHIVAL_MANAGEMENT_SYSTEM</p>
        <h1 class="cya__title font-natto">
          PRUSSIAN <span>//</span> ARCHIVE <span>//</span> 2026 <span>//</span>
          <button type="button" class="cya__title-link" @click="goFiles">COLLECTION_01</button>
        </h1>
      </div>
      <div class="cya__pills">
        <span>EXP_TIME: <strong>{{ expTime }}</strong></span>
        <span>LAT: <strong>52.5200° N</strong></span>
        <span class="cya__pill">UV_INDEX: LOW</span>
      </div>
    </header>

    <main class="cya__main">
      <section class="cya__hero">
        <div class="cya__metric">
          <div class="cya__figure">
            <span class="cya__used font-natto">42.8</span>
            <span class="cya__cap">/ 100 GB</span>
          </div>
          <div class="cya__bar" aria-hidden="true">
            <div class="cya__bar-fill" />
          </div>
          <div class="cya__stats">
            <span>FERRIC_LOAD: <strong class="is-chem">OPTIMAL</strong></span>
            <span>FIXING_TIME: <strong>12.4s</strong></span>
          </div>
        </div>

        <div class="cya__actions">
          <button type="button" class="cya__btn cya__btn--primary" @click="goFiles">
            [ EXPOSE_NEW_DRIVE ]
          </button>
          <button type="button" class="cya__btn" @click="goFiles">
            [ UPLOAD_SPEICHER ]
          </button>
        </div>
      </section>

      <aside class="cya__preview">
        <div class="cya__preview-head">
          <span>[ PREVIEW_ANALYSIS ]</span>
          <span class="cya__raw">RAW_CAPTURE</span>
        </div>
        <div class="cya__frame">
          <img
            :src="activeSpecimen.src"
            :alt="activeSpecimen.title"
            class="cya__frame-img is-cyanotype"
          />
          <div class="cya__frame-wash" />
        </div>
        <p class="cya__preview-meta">
          <span>{{ activeSpecimen.title }}</span>
          <span>{{ activeSpecimen.size }}</span>
        </p>
      </aside>
    </main>

    <footer class="cya__strip">
      <button
        v-for="file in specimenFiles"
        :key="file.id"
        type="button"
        class="cya__card"
        :class="{ 'is-active': activeSpecimen.id === file.id }"
        @click="activeSpecimen = file"
      >
        <div class="cya__thumb">
          <img :src="file.src" :alt="file.title" />
        </div>
        <div class="cya__card-meta">
          <span>{{ file.title }}</span>
          <span>{{ file.size }}</span>
        </div>
      </button>

      <button type="button" class="cya__append" @click="goFiles">
        <span class="cya__plus">+</span>
        <span>APPEND_ARCHIVE</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

interface Specimen {
  id: number
  title: string
  size: string
  src: string
}

const specimenFiles: Specimen[] = [
  {
    id: 1,
    title: 'PLANT_CELL_',
    size: '4.2MB',
    src: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80',
  },
  {
    id: 2,
    title: 'CONCRETE_LAB_',
    size: '8.9KB',
    src: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80',
  },
  {
    id: 3,
    title: 'LANDSCAPE_SCA_',
    size: '142MB',
    src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  },
  {
    id: 4,
    title: 'FLORA_SPECTRA_',
    size: '56.1MB',
    src: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=800&q=80',
  },
]

const activeSpecimen = ref<Specimen>(specimenFiles[3])
const expTime = ref('00:00:00')
const router = useRouter()
let timer = 0
const startedAt = Date.now()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function tick() {
  const s = Math.floor((Date.now() - startedAt) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  expTime.value = `${pad(h)}:${pad(m)}:${pad(s % 60)}`
}

function goFiles() {
  void router.push({ name: 'drive-files' })
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<style scoped lang="scss">
.cya {
  --canvas: #07151e;
  --canvas-deep: #0b1d28;
  --card: rgba(26, 59, 78, 0.4);
  --ink: #ebf4f6;
  --chem: #4ca6a4;
  --chem-bright: #68c2c0;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  height: 100vh;
  padding: 1.25rem 2.25rem 1.25rem 2.75rem;
  overflow: hidden;
  color: var(--ink);
  background: radial-gradient(120% 80% at 80% 0%, #0b1d28 0%, var(--canvas) 55%);
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, monospace;
}

.cya::selection,
.cya *::selection {
  color: var(--canvas);
  background: var(--chem);
}

.cya__grid {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, #1a3b4e18 1px, transparent 1px),
    linear-gradient(to bottom, #1a3b4e18 1px, transparent 1px);
  background-size: 32px 32px;
}

.cya__verse {
  pointer-events: none;
  position: absolute;
  left: 1.5rem;
  bottom: 38%;
  z-index: 1;
  max-width: 18rem;
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  line-height: 1.6;
  color: rgb(235 244 246 / 15%);
}

.cya__spine {
  display: none;
  pointer-events: none;
  position: absolute;
  top: 50%;
  z-index: 2;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgb(235 244 246 / 30%);
  white-space: nowrap;

  &--left {
    left: 0.5rem;
    transform: translateY(-50%) rotate(-90deg);
  }

  &--right {
    right: 0.5rem;
    transform: translateY(-50%) rotate(90deg);
  }
}

.cya__header {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(235 244 246 / 20%);
}

.cya__kicker {
  margin: 0;
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--chem);
}

.cya__title {
  margin: 0.25rem 0 0;
  font-size: clamp(1.1rem, 2.4vw, 1.65rem);
  font-weight: 700;
  letter-spacing: 0.02em;

  span {
    color: var(--chem);
  }
}

.cya__title-link {
  padding: 0;
  border: 0;
  color: inherit;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  cursor: pointer;

  &:hover {
    color: var(--chem-bright);
  }
}

.cya__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  font-size: 0.75rem;
  color: rgb(235 244 246 / 60%);

  strong {
    color: var(--ink);
    font-weight: 500;
  }
}

.cya__pill {
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--chem);
  background: rgb(76 166 164 / 10%);
  font-size: 10px;
  color: var(--chem);
}

.cya__main {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;
  padding: 1.25rem 0;
}

.cya__hero {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.25rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.cya__figure {
  display: flex;
  gap: 1rem;
  align-items: baseline;
}

.cya__used {
  font-size: clamp(3.25rem, 8vw, 6.25rem);
  line-height: 0.9;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.cya__cap {
  font-size: clamp(1.25rem, 3vw, 2.25rem);
  font-weight: 300;
  color: rgb(235 244 246 / 50%);
}

.cya__bar {
  width: 12rem;
  height: 0.4rem;
  margin-top: 1rem;
  overflow: hidden;
  background: rgb(235 244 246 / 20%);
}

.cya__bar-fill {
  width: 42.8%;
  height: 100%;
  background: var(--chem);
}

.cya__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: rgb(235 244 246 / 60%);

  strong {
    color: var(--ink);
    font-weight: 600;
  }

  .is-chem {
    color: var(--chem);
  }
}

.cya__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.cya__btn {
  padding: 0.65rem 1.25rem;
  border: 1px solid rgb(235 244 246 / 20%);
  background: transparent;
  color: rgb(235 244 246 / 70%);
  font: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  cursor: pointer;
  transition:
    border-color 0.3s,
    background 0.3s,
    color 0.3s;

  &:hover {
    border-color: var(--ink);
    color: var(--ink);
  }

  &--primary {
    border-color: rgb(235 244 246 / 40%);
    background: var(--card);
    color: var(--ink);

    &:hover {
      border-color: var(--chem);
      background: rgb(76 166 164 / 20%);
      color: var(--chem-bright);
    }
  }
}

.cya__preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  padding: 1.25rem;
  border: 1px solid rgb(235 244 246 / 20%);
  background: rgb(26 59 78 / 20%);
}

.cya__preview-head,
.cya__preview-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  color: var(--chem);
}

.cya__raw,
.cya__preview-meta {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: rgb(235 244 246 / 40%);
}

.cya__preview-meta span:first-child {
  color: rgb(235 244 246 / 80%);
}

.cya__frame {
  position: relative;
  aspect-ratio: 16 / 9;
  max-height: 32vh;
  overflow: hidden;
  border: 1px solid rgb(235 244 246 / 10%);
  background: var(--canvas-deep);
}

.cya__frame-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.7s ease;

  &.is-cyanotype {
    filter: grayscale(1) contrast(1.35) sepia(0.75) hue-rotate(168deg) saturate(2.4) brightness(0.82);
  }
}

.cya__frame-wash {
  position: absolute;
  inset: 0;
  background: rgb(11 29 40 / 32%);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.cya__strip {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

.cya__card {
  padding: 0.5rem;
  border: 1px solid rgb(235 244 246 / 20%);
  background: var(--card);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.45s,
    box-shadow 0.45s;

  .cya__thumb img {
    filter: grayscale(1) contrast(1.3) brightness(0.78) sepia(1) hue-rotate(162deg) saturate(2.8);
    transform: scale(1);
    transition:
      filter 0.5s ease,
      transform 0.5s ease;
  }

  &:hover,
  &.is-active {
    border-color: var(--chem);

    .cya__thumb img {
      filter: none;
      transform: scale(1.05);
    }

    .cya__card-meta span:first-child {
      color: var(--chem-bright);
    }
  }

  &.is-active {
    box-shadow: 0 0 15px rgb(76 166 164 / 30%);
  }
}

.cya__thumb {
  height: 5.25rem;
  overflow: hidden;
  background: var(--canvas);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cya__card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 10px;
  text-transform: uppercase;

  span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgb(235 244 246 / 80%);
  }

  span:last-child {
    color: rgb(235 244 246 / 40%);
  }
}

.cya__append {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 7.9rem;
  border: 1px dashed rgb(235 244 246 / 20%);
  background: transparent;
  color: rgb(235 244 246 / 40%);
  font: inherit;
  letter-spacing: 0.2em;
  font-size: 10px;
  cursor: pointer;
  transition:
    color 0.3s,
    border-color 0.3s;

  &:hover {
    color: var(--chem);
    border-color: var(--chem);
  }
}

.cya__plus {
  font-size: 1.15rem;
  letter-spacing: 0;
  line-height: 1;
}

@media (max-width: 767px) {
  .cya {
    height: auto;
    overflow: auto;
  }

  .cya__strip {
    display: flex;
    overflow-x: auto;
  }

  .cya__card,
  .cya__append {
    flex: 0 0 9.75rem;
  }
}

@media (min-width: 768px) {
  .cya {
    padding: 1.75rem 2.75rem 1.5rem 3.25rem;
  }

  .cya__header {
    align-items: center;
  }

  .cya__verse {
    left: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .cya__spine {
    display: block;
  }

  .cya__main {
    grid-template-columns: 7fr 5fr;
    align-items: center;
  }
}
</style>
