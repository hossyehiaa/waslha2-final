import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, sanitizeInput, createSession, setSessionCookie } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_LOGINS_PER_IP = 10

function requestIp(req: NextRequest) {
  return req.headers.get('x-vercel-forwarded-for')?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

async function recordFailedLogin(ipAddress: string) {
  await db.auditLog.create({ data: { action: 'LOGIN_FAILED', entity: 'Auth', ipAddress } }).catch(() => undefined)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = sanitizeInput(body.username || '').toLowerCase()
    const password = String(body.password || '')

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const ip = requestIp(req)
    const recentFailures = await db.auditLog.count({
      where: { action: 'LOGIN_FAILED', entity: 'Auth', ipAddress: ip, createdAt: { gte: new Date(Date.now() - LOGIN_WINDOW_MS) } },
    })
    if (recentFailures >= MAX_FAILED_LOGINS_PER_IP) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': '900' } })
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
    })

    if (!user) {
      await recordFailedLogin(ip)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.status !== 'ACTIVE') {
      await recordFailedLogin(ip)
      return NextResponse.json({ error: 'Account suspended. Contact administrator.' }, { status: 403 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      await recordFailedLogin(ip)
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
