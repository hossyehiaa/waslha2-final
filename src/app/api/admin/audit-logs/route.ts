import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await db.auditLog.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, username: true } } },
    })

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user?.fullName || l.user?.username || 'System',
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        beforeData: l.beforeData,
        afterData: l.afterData,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
