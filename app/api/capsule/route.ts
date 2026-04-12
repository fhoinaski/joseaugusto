import { NextRequest, NextResponse } from 'next/server'
import { uploadBuffer, objectUrl } from '@/lib/r2'
import { dbGetCapsuleCount, dbGetConfig, dbInsertCapsule } from '@/lib/db'

export async function GET() {
  const [count, openDate] = await Promise.all([
    dbGetCapsuleCount(),
    dbGetConfig('capsule_open_date', '18 anos'),
  ])
  return NextResponse.json({ count, openDate })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image   = formData.get('image')   as File | null
    const author  = ((formData.get('author')  as string) ?? '').trim().slice(0, 100)
    const message = ((formData.get('message') as string) ?? '').trim().slice(0, 500)

    if (!author || !message) {
      return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 })
    }

    let imageUrl = ''

    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer())
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const key    = `cha-jose-augusto/capsulas/capsule_${suffix}.png`
      await uploadBuffer(key, buffer, 'image/png', { author, type: 'capsule' })
      imageUrl = objectUrl(key)
    }

    await dbInsertCapsule(author, message, imageUrl)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
