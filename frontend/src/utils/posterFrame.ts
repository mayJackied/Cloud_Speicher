/** 从图片/GIF/视频 blob 抽出一帧静态图，不在网格里播放。 */

export async function stillFromBlob(blob: Blob, mode: 'image' | 'video'): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    return mode === 'video' ? await frameFromVideo(url) : await frameFromImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function frameFromImage(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, img.naturalWidth)
      canvas.height = Math.max(1, img.naturalHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error('frame'))), 'image/jpeg', 0.82)
    }
    img.onerror = () => reject(new Error('image'))
    img.src = url
  })
}

function frameFromVideo(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    let settled = false

    const fail = () => {
      if (settled) {
        return
      }
      settled = true
      video.src = ''
      reject(new Error('video'))
    }

    video.addEventListener('loadeddata', () => {
      const t = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(0.12, video.duration * 0.05) : 0
      try {
        video.currentTime = t
      } catch {
        fail()
      }
    })
    video.addEventListener('seeked', () => {
      if (settled) {
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, video.videoWidth)
      canvas.height = Math.max(1, video.videoHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        fail()
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((out) => {
        settled = true
        video.src = ''
        if (out) {
          resolve(out)
        } else {
          reject(new Error('frame'))
        }
      }, 'image/jpeg', 0.82)
    })
    video.addEventListener('error', fail)
    video.src = url
  })
}
