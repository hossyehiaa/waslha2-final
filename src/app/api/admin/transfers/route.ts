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

    const transfers = await db.branchTransfer.findMany({
      include: {
        fromBranch: { select: { name: true } },
        toBranch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      transfers: transfers.map((t) => ({
        id: t.id,
        reference: t.reference,
        fromBranch: t.fromBranch.name,
        toBranch: t.toBranch.name,
        shipmentCount: t.shipmentCount,
        totalValue: t.totalValue,
        status: t.status,
        sentAt: t.sentAt,
        receivedAt: t.receivedAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
