import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  const env = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }

  return env
}

function mergeEnvFromLocal() {
  const filePath = path.resolve(process.cwd(), '.env.local')
  const fromFile = loadEnvFile(filePath)
  for (const [k, v] of Object.entries(fromFile)) {
    if (!process.env[k]) process.env[k] = v
  }
}

function requireVars(names) {
  const missing = names.filter((n) => !process.env[n])
  return missing
}

async function verifyCloudflareToken() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token || !accountId) return { ok: false, detail: 'CLOUDFLARE_API_TOKEN ou CLOUDFLARE_ACCOUNT_ID ausente' }

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return { ok: false, detail: `HTTP ${res.status} ao verificar token` }
  }

  const json = await res.json()
  if (!json?.success) {
    const msg = json?.errors?.[0]?.message || 'token inválido'
    return { ok: false, detail: msg }
  }

  return { ok: true, detail: 'token válido' }
}

async function testD1Query() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID
  const token = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId || !dbId || !token) {
    return { ok: false, detail: 'variáveis D1 ausentes' }
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: 'SELECT 1 AS ok', params: [] }),
  })

  const text = await res.text()
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${text}` }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, detail: 'resposta D1 não é JSON válido' }
  }

  if (!json?.success) {
    const msg = json?.errors?.[0]?.message || 'consulta D1 falhou'
    return { ok: false, detail: msg }
  }

  return { ok: true, detail: 'consulta D1 OK (SELECT 1)' }
}

async function testR2Access() {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return { ok: false, detail: 'variáveis R2 ausentes' }
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })

  try {
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }))
    return { ok: true, detail: 'acesso ao bucket R2 OK' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, detail: msg }
  }
}

async function main() {
  mergeEnvFromLocal()

  const required = [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_D1_DATABASE_ID',
    'CLOUDFLARE_API_TOKEN',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ]

  const missing = requireVars(required)
  if (missing.length) {
    console.error('FALTANDO:', missing.join(', '))
    process.exit(1)
  }

  const results = []
  results.push(['Cloudflare token', await verifyCloudflareToken()])
  results.push(['Cloudflare D1', await testD1Query()])
  results.push(['Cloudflare R2', await testR2Access()])

  let failed = false
  for (const [name, result] of results) {
    if (result.ok) {
      console.log(`OK   ${name}: ${result.detail}`)
    } else {
      failed = true
      console.log(`ERRO ${name}: ${result.detail}`)
    }
  }

  if (failed) process.exit(1)
}

main().catch((err) => {
  console.error('Falha inesperada:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
