import { NextResponse } from 'next/server'
import { clearSessionCookie, getCurrentUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGOUT',
          entity: 'User',
          entityId: user.id,
        },
      })
    }
    await clearSessionCookie()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
