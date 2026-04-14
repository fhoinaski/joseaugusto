export function isHeicFile(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
}

export function renameWithExt(name: string, ext: string): string {
  const base = name.replace(/\.[^/.]+$/, '')
  return `${base}.${ext}`
}

export async function prepareImageBlob(
  file: File,
  maxPx = 2000,
  quality = 0.88,
): Promise<{ blob: Blob; previewUrl: string }> {
  let sourceBlob: Blob = file

  if (isHeicFile(file)) {
    try {
      const mod = await import('heic2any')
      const heic2any = mod.default as (args: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
      sourceBlob = Array.isArray(out) ? out[0] : out
    } catch {
      sourceBlob = file
    }
  }

  const blob = await new Promise<Blob>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(sourceBlob)
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve(sourceBlob)
    }, 10000)

    img.onload = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Always run through canvas — even for images within maxPx — so that:
      // 1. Wide-gamut (P3/HDR) ICC profiles are tone-mapped to sRGB
      // 2. Transparent/partial-alpha pixels are composited over white
      // 3. EXIF orientation is baked in (browsers apply it to <img> but not
      //    always to canvas.drawImage on older Android WebViews)
      const ratio = (width > maxPx || height > maxPx)
        ? Math.min(maxPx / width, maxPx / height)
        : 1
      const dw = Math.round(width * ratio)
      const dh = Math.round(height * ratio)

      try {
        const canvas = document.createElement('canvas')
        canvas.width = dw
        canvas.height = dh
        // Use explicit sRGB colorSpace so wide-gamut images are normalised
        const ctx = canvas.getContext('2d', { colorSpace: 'srgb' } as CanvasRenderingContext2DSettings) ?? canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, dw, dh)
          ctx.drawImage(img, 0, 0, dw, dh)
        }
        canvas.toBlob(b => resolve(b ?? sourceBlob), 'image/webp', quality)
      } catch {
        resolve(sourceBlob)
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      resolve(sourceBlob)
    }

    img.src = url
  })

  return { blob, previewUrl: URL.createObjectURL(blob) }
}

export async function validateShortVideo(file: File, maxBytes = 45 * 1024 * 1024, maxDurationSec = 45): Promise<{ ok: boolean; error?: string }> {
  if (!file.type.startsWith('video/')) return { ok: true }
  if (file.size > maxBytes) {
    return { ok: false, error: 'Video excede o limite de tamanho para upload rapido.' }
  }

  const duration = await new Promise<number>((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.src = ''
    }

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const value = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()
      resolve(value)
    }
    video.onerror = () => {
      cleanup()
      resolve(0)
    }
    video.src = url
  })

  if (duration > maxDurationSec) {
    return { ok: false, error: 'Video muito longo. Envie videos de ate 45 segundos.' }
  }

  return { ok: true }
}
