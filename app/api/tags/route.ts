import { NextRequest, NextResponse } from 'next/server'
import { dbGetPhotoTags, dbAddPhotoTag, dbGetTaggedPhotosForPerson } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const mediaId = req.nextUrl.searchParams.get('media_id')
    const person  = req.nextUrl.searchParams.get('person')

    if (person) {
      const photos = await dbGetTaggedPhotosForPerson(person)
      return NextResponse.json({ photos })
    }
    if (mediaId) {
      const tags = await dbGetPhotoTags(mediaId)
      return NextResponse.json({ tags })
    }
    return NextResponse.json(
      { error: 'Parâmetro obrigatório: media_id ou person' },
      { status: 400 },
    )
  } catch (err) {
    console.error('[tags GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { media_id?: string; tagged_name?: string; tagged_by?: string }
    const { media_id, tagged_name, tagged_by } = body
    if (!media_id || !tagged_name?.trim()) {
      return NextResponse.json(
        { error: 'media_id e tagged_name são obrigatórios' },
        { status: 400 },
      )
    }
    const ok = await dbAddPhotoTag(
      media_id,
      tagged_name.trim(),
      tagged_by?.trim() || 'Convidado',
    )
    if (!ok) {
      return NextResponse.json(
        { error: 'Esta pessoa já foi marcada nesta foto.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[tags POST]', err)
    return NextResponse.json({ error: 'Erro ao adicionar tag.' }, { status: 500 })
  }
}
