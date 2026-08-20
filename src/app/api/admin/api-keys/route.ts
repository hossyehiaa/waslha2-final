import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { generatePartnerApiKey, keyPrefix, parseScopes, scopeLabel } from '@/lib/partner-api'

export const runtime = 'nodejs'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function serializeKey(key: { id: string; keyPrefix: string | null; key: string | null; name: string; scopes: string; isActive: boolean; isTestMode: boolean; lastUsedAt: Date | null; createdAt: Date }) {
  const prefix = key.keyPrefix || (key.key ? keyPrefix(key.key) : 'wsl_')
  return { id: key.id, key: `${prefix}...`, keyPrefix: prefix, name: key.name, scopes: parseScopes(key.scopes).map(scopeLabel).join(','), isActive: key.isActive, isTestMode: key.isTestMode, lastUsedAt: key.lastUsedAt, createdAt: key.createdAt }
}

async function resolveClientId(user: Awaited<ReturnType<typeof getCurrentUser>>, requested?: string | null) {
  if (!user) return null
  if (user.role === 'CLIENT') return user.clientId || null
  return requested || null
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const requestedClientId = new URL(req.url).searchParams.get('clientId')
    const clientId = await resolveClientId(user, requestedClientId)
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })
    const keys = await db.apiKey.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ keys: keys.map(serializeKey) })
  } catch (error) {
    console.error('API key list error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const body = await req.json()
    const clientId = await resolveClientId(user, body.clientId)
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 120) return NextResponse.json({ error: 'A key name is required' }, { status: 400 })
    const scopes = parseScopes(Array.isArray(body.scopes) ? body.scopes.join(',') : body.scopes)
    if (!scopes.length) return NextResponse.json({ error: 'At least one valid scope is required' }, { status: 400 })

    const rawKey = generatePartnerApiKey()
    const record = await db.apiKey.create({
      data: {
        clientId,
        keyHash: await bcrypt.hash(rawKey, 12),
        keyPrefix: keyPrefix(rawKey),
        name,
        scopes: scopes.map(scopeLabel).join(','),
        isTestMode: Boolean(body.isTestMode),
        isActive: true,
      },
    })
    return NextResponse.json({ id: record.id, key: rawKey, keyPrefix: record.keyPrefix, name: record.name, scopes: scopes.map(scopeLabel).join(','), isTestMode: record.isTestMode, message: 'Save this key securely; the full key will not be shown again' }, { status: 201 })
  } catch (error) {
    console.error('API key create error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
