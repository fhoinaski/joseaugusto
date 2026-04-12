import { NextRequest, NextResponse } from 'next/server'
import cloudinary, { getCapsuleCount, getCapsuleOpenDate } from '@/lib/cloudinary'

export async function GET() {
  const [count, openDate] = await Promise.all([getCapsuleCount(), getCapsuleOpenDate()])
  return NextResponse.json({ count, openDate })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image    = formData.get('image')   as File | null
    const author   = ((formData.get('author')  as string) ?? '').trim().slice(0, 100)
    const message  = ((formData.get('message') as string) ?? '').trim().slice(0, 500)

    if (!author || !message) {
      return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 })
    }

    const context = [
      'type=capsule',
      `author=${encodeURIComponent(author)}`,
      `message=${encodeURIComponent(message)}`,
      `created_at=${new Date().toISOString()}`,
    ].join('|')

    if (image && image.size > 0) {
      const buffer  = Buffer.from(await image.arrayBuffer())
      const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
      await cloudinary.uploader.upload(dataUrl, { folder: 'cha-jose-augusto/capsulas', context })
    } else {
      // Fallback: tiny placeholder
      const tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      await cloudinary.uploader.upload(tiny, { folder: 'cha-jose-augusto/capsulas', context })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
