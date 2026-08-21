import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { parseScopes, scopeLabel } from '@/lib/partner-api'

export const runtime = 'nodejs'

async function authorizedKey(user: Awaited<ReturnType<typeof getCurrentUser>>, id: string) {
  if (!user) return null
  const key = await db.apiKey.findUnique({ where: { id } })
  if (!key) return null
  if (user.role === 'CLIENT' && key.clientId !== user.clientId) return null
  return key
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const existing = await authorizedKey(user, id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
      data.name = body.name.trim()
    }
    if (body.scopes !== undefined) {
      const scopes = parseScopes(Array.isArray(body.scopes) ? body.scopes.join(',') : body.scopes)
      if (!scopes.length) return NextResponse.json({ error: 'At least one valid scope is required' }, { status: 400 })
      data.scopes = scopes.map(scopeLabel).join(',')
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body.isTestMode !== undefined) data.isTestMode = Boolean(body.isTestMode)
    const updated = await db.apiKey.update({ where: { id }, data })
    return NextResponse.json({ key: { id: updated.id, name: updated.name, scopes: updated.scopes, isActive: updated.isActive, isTestMode: updated.isTestMode, lastUsedAt: updated.lastUsedAt, createdAt: updated.createdAt } })
  } catch (error) {
    console.error('API key update error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const existing = await authorizedKey(user, id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.apiKey.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API key revoke error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
