import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const where: any = {}
    if (user.role === 'CLIENT') where.clientId = user.clientId

    const pickups = await db.pickupRequest.findMany({
      where,
      include: {
        client: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      pickups: pickups.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        clientName: p.client.companyName,
        pickupAddress: p.pickupAddress,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        packagesCount: p.packagesCount,
        totalWeight: p.totalWeight,
        status: p.status,
        requestedDate: p.requestedDate,
        scheduledDate: p.scheduledDate,
        notes: p.notes,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
