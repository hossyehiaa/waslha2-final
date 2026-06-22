import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = user.role === 'CLIENT' ? user.clientId : undefined
    const where = clientId ? { clientId } : {}

    const [
      totalShipments,
      activeShipments,
      deliveredShipments,
      client,
      recentShipments,
      codSettlements,
    ] = await Promise.all([
      db.shipment.count({ where }),
      db.shipment.count({ where: { ...where, status: { in: ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
      db.shipment.count({ where: { ...where, status: 'DELIVERED' } }),
      db.client.findUnique({ where: { id: clientId }, select: { codBalance: true, codCollected: true, codPending: true, shippingBalance: true, companyName: true } }),
      db.shipment.findMany({
        where,
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
        },
      }),
      db.codSettlement.findMany({
        where: clientId ? { clientId } : {},
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const count = await db.shipment.count({
        where: { ...where, createdAt: { gte: d, lt: next } },
      })
      days.push({
        date: d.toISOString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        shipments: count,
      })
    }

    return NextResponse.json({
      stats: {
        totalShipments,
        activeShipments,
        deliveredShipments,
        codBalance: client?.codBalance || 0,
        codCollected: client?.codCollected || 0,
        codPending: client?.codPending || 0,
        shippingBalance: client?.shippingBalance || 0,
      },
      chart: { days },
      recentShipments: recentShipments.map((s) => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        from: s.senderCity.name,
        to: s.recipientCity.name,
        status: s.status,
        codAmount: s.codAmount,
        createdAt: s.createdAt,
      })),
      settlements: codSettlements.map((s) => ({
        id: s.id,
        reference: s.reference,
        period: s.period,
        netAmount: s.netAmount,
        status: s.status,
        createdAt: s.createdAt,
      })),
    })
  } catch (e: any) {
    console.error('Client dashboard error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
