import { NextRequest, NextResponse } from 'next/server'
import { uploadBuffer, objectUrl } from '@/lib/r2'
import {
  dbGetVideoMensagens,
  dbCreateVideoMensagem,
  dbApproveVideoMensagem,
  dbDeleteVideoMensagem,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

const MAX_VIDEO = 100 * 1024 * 1024 // 100 MB

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const adminMode = searchParams.get('admin') === '1'
    const items = await dbGetVideoMensagens(!adminMode)
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[video-mensagens GET]', err)
    return NextResponse.json({ items: [], error: 'Erro ao carregar vídeos.' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const r2AccessKeyId = (process.env.R2_ACCESS_KEY_ID ?? '').trim()
    const r2Secret      = (process.env.R2_SECRET_ACCESS_KEY ?? '').trim()
    const r2Endpoint    = (process.env.R2_ENDPOINT ?? '').trim()
    const r2Bucket      = (process.env.R2_BUCKET_NAME ?? '').trim()
    const r2PublicUrl   = (process.env.R2_PUBLIC_URL ?? '').trim()

    const missingR2Env = [
      !r2Endpoint    ? 'R2_ENDPOINT'            : '',
      !r2AccessKeyId ? 'R2_ACCESS_KEY_ID'        : '',
      !r2Secret      ? 'R2_SECRET_ACCESS_KEY'    : '',
      !r2Bucket      ? 'R2_BUCKET_NAME'          : '',
      !r2PublicUrl   ? 'R2_PUBLIC_URL'           : '',
    ].filter(Boolean)

    if (missingR2Env.length > 0) {
      return NextResponse.json({ error: 'Configuração de armazenamento incompleta.' }, { status: 500 })
    }

    const formData  = await req.formData()
    const file      = formData.get('video') as File | null
    const authorRaw = ((formData.get('author') as string) || '').trim()
    const author    = authorRaw.slice(0, 60)
    const message   = ((formData.get('message') as string) || '').trim().slice(0, 500)

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }
    if (!author) {
      return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
    }
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Envie um arquivo de vídeo.' }, { status: 400 })
    }
    if (file.size > MAX_VIDEO) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 100 MB.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const body        = Buffer.from(arrayBuffer)
    const suffix      = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const ext         = file.name.split('.').pop() ?? 'mp4'
    const key         = `video-mensagens/video_${suffix}.${ext}`

    await uploadBuffer(key, body, file.type, { author })

    const videoUrl = objectUrl(key)

    await dbCreateVideoMensagem({
      author,
      video_url: videoUrl,
      message:   message || undefined,
    })

    return NextResponse.json({ ok: true, video_url: videoUrl }, { status: 201 })
  } catch (err) {
    console.error('[video-mensagens POST]', err)
    return NextResponse.json({ error: 'Erro ao enviar vídeo. Tente novamente.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id?: number; approved?: number }
    const { id, approved } = body
    if (typeof id !== 'number' || typeof approved !== 'number') {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
    }
    await dbApproveVideoMensagem(id, approved)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[video-mensagens PATCH]', err)
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') ?? '', 10)
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
    }
    await dbDeleteVideoMensagem(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[video-mensagens DELETE]', err)
    return NextResponse.json({ error: 'Erro ao deletar.' }, { status: 500 })
  }
}
