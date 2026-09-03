<template>
  <pre class="glyph" :data-style="style" aria-hidden="true">{{ text }}</pre>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { pickGlyphStyle, rasterizeGlyph, type GlyphStyle } from '@/utils/rasterizeGlyph'

const props = withDefaults(
  defineProps<{
    src: string
    fallback: string
    cols?: number
    rows?: number
  }>(),
  {
    cols: 32,
    rows: 18,
  },
)

const text = ref(props.fallback)
const style = ref<GlyphStyle>(pickGlyphStyle())

async function sample() {
  try {
    const next = pickGlyphStyle()
    const sampled = await rasterizeGlyph(props.src, props.cols, props.rows, next)
    text.value = sampled.text
    style.value = sampled.style
  } catch {
    text.value = props.fallback
  }
}

onMounted(() => {
  void sample()
})

watch(
  () => [props.src, props.cols, props.rows],
  () => {
    void sample()
  },
)
</script>

<style scoped>
.glyph {
  margin: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  white-space: pre;
  user-select: none;
}

.glyph[data-style='block'] {
  letter-spacing: 0;
  line-height: 1;
  font-size: 12px;
}

.glyph[data-style='geek'] {
  letter-spacing: 0.06em;
}

.glyph[data-style='dots'] {
  letter-spacing: 0.02em;
}
</style>
