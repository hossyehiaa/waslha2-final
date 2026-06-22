import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const returns = await db.return.findMany({
      include: { shipment: { select: { trackingNumber: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      returns: returns.map((r) => ({
        id: r.id,
        shipmentId: r.shipmentId,
        trackingNumber: r.shipment.trackingNumber,
        reason: r.reason,
        status: r.status,
        condition: r.condition,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
