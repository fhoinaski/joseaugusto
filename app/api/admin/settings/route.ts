import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { dbGetConfig, dbSetConfig, dbGetAccessKeys, dbInsertAccessKey, dbDeleteAccessKey } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'

export async function GET() {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const geoGate = await dbGetConfig('geo_gate_enabled', '0')
  const keys = await dbGetAccessKeys()
  return NextResponse.json({ geoGateEnabled: geoGate === '1', keys })
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const body = await req.json()

  if ('geoGateEnabled' in body) {
    await dbSetConfig('geo_gate_enabled', body.geoGateEnabled ? '1' : '0')
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'change_password') {
    const pw = body.password?.toString().trim()
    if (!pw || pw.length < 6) return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
    await dbSetConfig('admin_password', pw)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'add_key') {
    const name = body.name?.toString().trim().slice(0, 80)
    const key  = body.key?.toString().trim().slice(0, 60)
    if (!name || !key) return NextResponse.json({ error: 'Nome e chave são obrigatórios' }, { status: 400 })
    await dbInsertAccessKey(name, key)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete_key') {
    await dbDeleteAccessKey(Number(body.id))
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'baby_status') {
    const { babyBorn, babyDueDate, babyBornWeightG, babyBornHora, babyBornCabelo } = body
    const wasAlreadyBorn = (await dbGetConfig('baby_born', '0')) === '1'
    if (typeof babyBorn === 'boolean') {
      await dbSetConfig('baby_born', babyBorn ? '1' : '0')
    }
    if (typeof babyDueDate === 'string') {
      await dbSetConfig('baby_due_date', babyDueDate.trim())
    }
    if (babyBornWeightG !== undefined) {
      await dbSetConfig('baby_born_weight_g', babyBornWeightG ? String(Math.round(Number(babyBornWeightG))) : '')
    }
    if (typeof babyBornHora === 'string') {
      await dbSetConfig('baby_born_hora', babyBornHora.trim())
    }
    if (typeof babyBornCabelo === 'string') {
      await dbSetConfig('baby_born_cabelo', babyBornCabelo.trim())
    }
    // Dispara push "bebê nasceu" apenas na primeira vez que é marcado como nascido
    if (babyBorn === true && !wasAlreadyBorn) {
      try {
        const weightG = babyBornWeightG ? Number(babyBornWeightG) : null
        const weightStr = weightG ? ` · ${(weightG / 1000).toFixed(2).replace('.', ',')} kg` : ''
        const horaStr = babyBornHora ? ` · ${babyBornHora}` : ''
        await sendPushToAll({
          title: '🍼 José Augusto chegou!',
          body: `Bem-vindo ao mundo, pequenino!${weightStr}${horaStr}`,
          icon: '/icon-192.png',
          url: '/',
        })
      } catch { /* push falhou — não bloqueia a resposta */ }
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
