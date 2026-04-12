import { NextRequest, NextResponse } from 'next/server'

const MAX_IMAGE = 6 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('media') as File | null

    if (!file) return NextResponse.json({ error: 'Imagem não enviada' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Somente imagem' }, { status: 400 })
    if (file.size > MAX_IMAGE) return NextResponse.json({ error: 'Imagem muito grande para legenda IA' }, { status: 400 })

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const token = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !token) {
      return NextResponse.json({ caption: 'Um momento especial para lembrar! ✨', degraded: true })
    }

    const prompt = 'Gere UMA legenda curta em português do Brasil para foto de festa de chá de bebê. Tom afetuoso e alegre. Máximo 90 caracteres. Sem hashtags.'

    const aiBody = new FormData()
    aiBody.append('image', file)
    aiBody.append('prompt', prompt)

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: aiBody,
      },
    )

    if (!res.ok) {
      return NextResponse.json({ caption: 'Nosso pequeno milagre em um clique 💛', degraded: true })
    }

    const json = await res.json() as { result?: { response?: string } }
    const raw = json?.result?.response?.trim() ?? ''
    const caption = raw.replace(/\s+/g, ' ').slice(0, 120) || 'Um momento especial para lembrar! ✨'

    return NextResponse.json({ caption })
  } catch {
    return NextResponse.json({ caption: 'Um momento especial para lembrar! ✨', degraded: true })
  }
}
