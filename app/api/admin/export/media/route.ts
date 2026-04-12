import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { isAuthenticated } from '@/lib/auth'
import { getObjectBuffer, listObjectsByPrefix } from '@/lib/r2'

function mediaFolderFromKey(key: string): 'images' | 'videos' | 'audio' | 'other' {
  if (key.includes('/fotos/')) return 'images'
  if (key.includes('/videos/')) return 'videos'
  if (key.includes('/audio/')) return 'audio'
  return 'other'
}

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const keys = await listObjectsByPrefix('cha-jose-augusto/')
    const mediaKeys = keys.filter(k => !k.includes('/config/'))

    const zip = new JSZip()
    const root = zip.folder('cha-jose-augusto')

    // Keep memory bounded by processing sequentially.
    for (const key of mediaKeys) {
      const folder = mediaFolderFromKey(key)
      const filename = key.split('/').pop() ?? key.replaceAll('/', '_')
      const data = await getObjectBuffer(key)
      root?.folder(folder)?.file(filename, data)
    }

    const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const body = new Uint8Array(out)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cha-midias-${new Date().toISOString().slice(0, 10)}.zip"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
