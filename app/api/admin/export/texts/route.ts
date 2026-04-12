import { NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbExportCapsules, dbExportComments, dbGetConfig, DEFAULT_PARENTS_MSG } from '@/lib/db'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const [capsules, comments, parentsMessage] = await Promise.all([
      dbExportCapsules(),
      dbExportComments(),
      dbGetConfig('parents_message', DEFAULT_PARENTS_MSG),
    ])

    const payload = {
      exportedAt: new Date().toISOString(),
      parentsMessage,
      capsules,
      comments,
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="cha-textos-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
