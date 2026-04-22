export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { dbGetMusicas, dbInsertMusica, dbVoteMusica } from '@/lib/db'
import { cleanText, jsonError, jsonServerError, readJsonBody, requireRateLimit } from '@/lib/api-helpers'

const POST_LIMIT = 12
const VOTE_LIMIT = 80
const WINDOW_MS = 60 * 60 * 1000

export async function GET() {
  try {
    const musicas = await dbGetMusicas(true)
    return NextResponse.json({ musicas })
  } catch (err) {
    return jsonServerError('[musicas GET]', err, 'Erro ao carregar musicas.')
  }
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody<Record<string, unknown>>(req)
  if (!body) return jsonError('Requisicao invalida.', 400)

  if (body.action === 'vote') {
    const limited = requireRateLimit(req, 'musicas-vote', {
      limit: VOTE_LIMIT,
      windowMs: WINDOW_MS,
      message: 'Muitos votos em pouco tempo. Tente novamente mais tarde.',
    })
    if (limited) return limited

    const id = Number(body.id)
    if (!Number.isInteger(id) || id <= 0) return jsonError('Musica invalida.', 400)

    try {
      const voterId = cleanText(body.voterId, 120, 'anon') || 'anon'
      await dbVoteMusica(id, voterId)
      const musicas = await dbGetMusicas(true)
      return NextResponse.json({ ok: true, musicas })
    } catch (err) {
      return jsonServerError('[musicas vote]', err, 'Erro ao registrar voto.')
    }
  }

  const limited = requireRateLimit(req, 'musicas-post', {
    limit: POST_LIMIT,
    windowMs: WINDOW_MS,
    message: 'Muitas sugestoes em pouco tempo. Tente novamente mais tarde.',
  })
  if (limited) return limited

  const author = cleanText(body.author, 80)
  const title = cleanText(body.title, 120)
  const artist = cleanText(body.artist, 120)
  const spotifyUrl = cleanText(body.spotifyUrl, 300) || null

  if (!author || !title || !artist) return jsonError('Nome, titulo e artista sao obrigatorios.', 400)

  try {
    await dbInsertMusica(author, title, artist, spotifyUrl)
    const musicas = await dbGetMusicas(true)
    return NextResponse.json({ ok: true, musicas })
  } catch (err) {
    return jsonServerError('[musicas POST]', err, 'Erro ao salvar sugestao.')
  }
}
