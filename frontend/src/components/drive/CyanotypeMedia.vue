<template>
  <div
    class="cyano"
    :class="{ 'is-revealed': revealed }"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <img
      v-if="src && !broken"
      class="cyano__photo"
      :src="src"
      :alt="alt"
      @error="broken = true"
      @load="broken = false"
    />
    <div v-else class="cyano__void" />
    <div class="cyano__wash" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    forceReveal?: boolean
    hoverReveal?: boolean
  }>(),
  {
    hoverReveal: true,
  },
)

const revealed = ref(Boolean(props.forceReveal))
const broken = ref(false)

function onEnter() {
  if (props.hoverReveal) {
    revealed.value = true
  }
}

function onLeave() {
  if (props.hoverReveal) {
    revealed.value = Boolean(props.forceReveal)
  }
}

watch(
  () => props.src,
  () => {
    broken.value = false
  },
)

watch(
  () => props.forceReveal,
  (value) => {
    revealed.value = Boolean(value)
  },
)
</script>

<style scoped>
.cyano {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: #07151e;
}

.cyano__photo,
.cyano__void {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1);
  filter: grayscale(1) contrast(1.22) brightness(0.82);
  transition:
    filter 500ms ease,
    transform 500ms ease;
}

.cyano__void {
  background:
    linear-gradient(135deg, #0a2a3c 0%, #06131b 55%, #0c3d4a 100%);
}

.cyano__wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: #0a5578;
  mix-blend-mode: color;
  opacity: 1;
  transition: opacity 500ms ease;
}

.cyano__wash::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #082433;
  mix-blend-mode: multiply;
  opacity: 0.42;
  transition: opacity 500ms ease;
}

.cyano.is-revealed .cyano__photo {
  filter: none;
  transform: scale(1.015);
}

.cyano.is-revealed .cyano__wash,
.cyano.is-revealed .cyano__wash::after {
  opacity: 0;
}
</style>
