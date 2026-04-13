import { NextRequest, NextResponse } from 'next/server'

// Uses Cloudflare AI (LLaVA) to suggest a creative Portuguese caption for a baby shower photo.
// Fails open: if AI is unavailable, returns null so the UI degrades gracefully.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ caption: null })

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const token     = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !token) return NextResponse.json({ caption: null })

    // Convert image to base64 for the vision model
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const body = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${file.type || 'image/jpeg'};base64,${base64}` },
            },
            {
              type: 'text',
              text: 'Você está ajudando a criar legendas para um álbum de Chá de Bebê do José Augusto. Olhe a foto e sugira UMA legenda curta, carinhosa e criativa em português (máximo 120 caracteres). Responda apenas com a legenda, sem aspas.',
            },
          ],
        },
      ],
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/llava-hf/llava-1.5-7b-hf`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!res.ok) return NextResponse.json({ caption: null })

    const json = await res.json() as { result?: { response?: string } }
    const raw  = json.result?.response?.trim() ?? ''

    // Clean up: remove leading/trailing quotes and limit length
    const caption = raw.replace(/^["'「]|["'」]$/g, '').slice(0, 140)
    return NextResponse.json({ caption: caption || null })

  } catch {
    // Fail open — AI unavailable
    return NextResponse.json({ caption: null })
  }
}
