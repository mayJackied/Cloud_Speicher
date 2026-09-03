export const GLYPH_STYLES = {
  block: ' ░▒▓█',
  geek: ' .:+*#X%',
  dots: ' .·:;:i1tfLCG08@',
} as const

export type GlyphStyle = keyof typeof GLYPH_STYLES

const STYLE_NAMES = Object.keys(GLYPH_STYLES) as GlyphStyle[]

export function pickGlyphStyle(rand = Math.random): GlyphStyle {
  return STYLE_NAMES[Math.floor(rand() * STYLE_NAMES.length)] ?? 'block'
}

export function charAtInk(ink: number, ramp: string): string {
  const last = ramp.length - 1
  if (last < 0) {
    return ' '
  }
  const t = Math.min(1, Math.max(0, ink))
  return ramp[Math.round(t * last)] ?? ' '
}

/** alpha 高且越黑，字符越密。透明处留白。 */
export function charForInk(alpha: number, luminance: number, ramp = GLYPH_STYLES.dots): string {
  return charAtInk(alpha * (1 - luminance), ramp)
}

export function glyphFromRgba(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  ramp = GLYPH_STYLES.dots,
): string {
  const lines: string[] = []
  for (let y = 0; y < height; y += 1) {
    let line = ''
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const r = (data[i] ?? 0) / 255
      const g = (data[i + 1] ?? 0) / 255
      const b = (data[i + 2] ?? 0) / 255
      const a = (data[i + 3] ?? 0) / 255
      line += charForInk(a, (r + g + b) / 3, ramp)
    }
    lines.push(line)
  }
  return lines.join('\n')
}

function inkAt(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let ink = 0
  let n = 0
  const left = Math.max(0, Math.floor(x0))
  const top = Math.max(0, Math.floor(y0))
  const right = Math.min(width, Math.ceil(x1))
  const bottom = Math.min(height, Math.ceil(y1))
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const i = (y * width + x) * 4
      const a = (data[i + 3] ?? 0) / 255
      const lum = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 765
      ink += a * (1 - lum)
      n += 1
    }
  }
  return n ? ink / n : 0
}

export function rasterizeGlyph(
  src: string,
  cols = 32,
  rows = 18,
  style: GlyphStyle = pickGlyphStyle(),
): Promise<{ text: string; style: GlyphStyle }> {
  const ramp = GLYPH_STYLES[style]
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'sync'
    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx || width < 1 || height < 1) {
        reject(new Error('canvas'))
        return
      }
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, width, height)
      const cellW = width / cols
      const cellH = height / rows
      const lines: string[] = []
      for (let row = 0; row < rows; row += 1) {
        let line = ''
        for (let col = 0; col < cols; col += 1) {
          const ink = inkAt(data, width, height, col * cellW, row * cellH, (col + 1) * cellW, (row + 1) * cellH)
          line += charAtInk(ink, ramp)
        }
        lines.push(line)
      }
      resolve({ text: lines.join('\n'), style })
    }
    img.onerror = () => reject(new Error('glyph'))
    img.src = src
  })
}
