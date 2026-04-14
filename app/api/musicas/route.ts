import { NextRequest, NextResponse } from 'next/server'
import { dbGetMusicas, dbInsertMusica, dbVoteMusica } from '@/lib/db'

export async function GET() {
  const musicas = await dbGetMusicas(true)
  return NextResponse.json({ musicas })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'vote') {
    const voterId = body.voterId?.toString().trim().slice(0, 120) || 'anon'
    await dbVoteMusica(Number(body.id), voterId)
    const musicas = await dbGetMusicas(true)
    return NextResponse.json({ ok: true, musicas })
  }

  const author     = body.author?.toString().trim().slice(0, 80)
  const title      = body.title?.toString().trim().slice(0, 120)
  const artist     = body.artist?.toString().trim().slice(0, 120)
  const spotifyUrl = body.spotifyUrl?.toString().trim().slice(0, 300) || null

  if (!author || !title || !artist) return NextResponse.json({ error: 'Nome, título e artista são obrigatórios' }, { status: 400 })
  await dbInsertMusica(author, title, artist, spotifyUrl)
  const musicas = await dbGetMusicas(true)
  return NextResponse.json({ ok: true, musicas })
}
