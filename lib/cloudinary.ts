import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

export interface MediaItem {
  id: string
  thumbUrl: string
  fullUrl: string
  author: string
  status: 'approved' | 'pending' | 'rejected'
  type: 'image' | 'video'
  createdAt: string
}

function mapResource(r: any): MediaItem {
  const isVideo = r.resource_type === 'video'
  return {
    id:       r.public_id,
    // For videos: generate a JPG poster from the first frame (so_0)
    thumbUrl: isVideo
      ? cloudinary.url(r.public_id, {
          resource_type: 'video', format: 'jpg',
          width: 400, height: 400, crop: 'fill',
          quality: 'auto', start_offset: '0'
        })
      : cloudinary.url(r.public_id, {
          width: 400, height: 400, crop: 'fill',
          quality: 'auto', fetch_format: 'auto'
        }),
    fullUrl: isVideo
      ? cloudinary.url(r.public_id, { resource_type: 'video', quality: 'auto' })
      : cloudinary.url(r.public_id, { width: 1400, quality: 'auto', fetch_format: 'auto' }),
    author:    r.context?.custom?.author ?? 'Convidado',
    status:    (r.context?.custom?.status ?? 'pending') as MediaItem['status'],
    type:      isVideo ? 'video' : 'image',
    createdAt: r.created_at,
  }
}

export async function getMedia(status: string, cursor?: string) {
  const result = await (cloudinary.api as any).resources({
    type: 'upload', resource_type: 'image',
    prefix: 'cha-jose-augusto/', max_results: 50,
    next_cursor: cursor, context: true, tags: true,
  })
  // Also fetch videos
  let videoRes: any = { resources: [] }
  try {
    videoRes = await (cloudinary.api as any).resources({
      type: 'upload', resource_type: 'video',
      prefix: 'cha-jose-augusto/', max_results: 20,
      context: true,
    })
  } catch {}

  const all = [...result.resources, ...videoRes.resources]
    .map(mapResource)
    .filter(m => m.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { media: all, nextCursor: result.next_cursor ?? null }
}

export async function updateStatus(publicId: string, status: string, resourceType = 'image') {
  await (cloudinary.api as any).update(publicId, { context: `status=${status}` }, { resource_type: resourceType })
}

const MSG_ID = 'cha-jose-augusto/config/parents-message'
export const DEFAULT_MSG = 'Antes mesmo de você chegar, já existia um amor que não cabia no mundo. Cada foto aqui é um pedaço do dia em que o nosso mundo ficou maior, mais barulhento e infinitamente mais bonito. Você ainda não sabe, mas já é o amor mais bonito das nossas vidas. Bem-vindo, José Augusto — a festa foi só o começo.'

export async function getParentsMessage(): Promise<string> {
  try {
    const res = await cloudinary.api.resource(MSG_ID, { context: true })
    return res.context?.custom?.message ?? DEFAULT_MSG
  } catch { return DEFAULT_MSG }
}

export async function setParentsMessage(message: string) {
  try {
    await cloudinary.api.update(MSG_ID, { context: `message=${message}` })
  } catch {
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await cloudinary.uploader.upload(tiny, { public_id: MSG_ID, context: `message=${message}` })
  }
}

// Realtime: store latest upload timestamp
const RT_ID = 'cha-jose-augusto/config/realtime'
export async function pingRealtime(author: string, thumbUrl: string) {
  const data = JSON.stringify({ author, thumbUrl, ts: Date.now() })
  try {
    await cloudinary.api.update(RT_ID, { context: `data=${encodeURIComponent(data)}` })
  } catch {
    const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    await cloudinary.uploader.upload(tiny, { public_id: RT_ID, context: `data=${encodeURIComponent(data)}` })
  }
}

export async function getRealtimeData() {
  try {
    const res = await cloudinary.api.resource(RT_ID, { context: true })
    const raw = res.context?.custom?.data
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw))
  } catch { return null }
}
