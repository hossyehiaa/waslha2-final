import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, sanitizeInput, createSession, setSessionCookie } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = sanitizeInput(body.username || '').toLowerCase()
    const password = String(body.password || '')

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for') || 'unknown'

    const user = await db.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account suspended. Contact administrator.' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession(user.id, ip)
    await setSessionCookie(token)

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: ip,
      },
    })

    const redirect = user.role === 'ADMIN' || user.role === 'EMPLOYEE' ? '/admin' : '/dashboard'
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      redirect,
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
