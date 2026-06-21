import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import crypto from 'crypto'

export const runtime = 'nodejs'

function generateApiKey(): string {
  return `wsl_${crypto.randomBytes(24).toString('hex')}`
}

// GET - list client's API keys
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clientId = user.role === 'CLIENT' ? user.clientId : null
    if (!clientId) return NextResponse.json({ error: 'No client account' }, { status: 400 })

    const keys = await db.apiKey.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      keys: keys.map(k => ({
        id: k.id,
        key: k.key.substring(0, 12) + '...', // mask the key
        name: k.name,
        scopes: k.scopes,
        isActive: k.isActive,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - create new API key
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clientId = user.role === 'CLIENT' ? user.clientId : null
    if (!clientId) return NextResponse.json({ error: 'No client account' }, { status: 400 })

    const { name, scopes } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const key = generateApiKey()
    const apiKey = await db.apiKey.create({
      data: {
        clientId,
        key,
        name,
        scopes: scopes || 'shipments:read,shipments:write',
        isActive: true,
      },
    })

    return NextResponse.json({
      id: apiKey.id,
      key, // return full key only once
      name: apiKey.name,
      scopes: apiKey.scopes,
      message: 'Save this key securely - you won\'t be able to see it again',
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - revoke API key
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clientId = user.role === 'CLIENT' ? user.clientId : null
    if (!clientId) return NextResponse.json({ error: 'No client account' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await db.apiKey.delete({ where: { id, clientId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
