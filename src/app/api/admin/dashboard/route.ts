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

    const [
      totalShipments,
      todayShipments,
      pendingCodAgg,
      readyToPayAgg,
      paidCodAgg,
      totalClients,
      activeDrivers,
      totalBranches,
      pendingPickups,
      pendingTransfers,
      receivedTransfers,
      payoutRequests,
      flyerRequests,
      recentShipments,
    ] = await Promise.all([
      db.shipment.count(),
      db.shipment.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'PENDING' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'COLLECTED' } }),
      db.shipment.aggregate({ _sum: { codAmount: true }, where: { paymentStatus: 'SETTLED' } }),
      db.client.count(),
      db.driver.count({ where: { status: 'ACTIVE' } }),
      db.branch.count(),
      db.pickupRequest.count({ where: { status: 'PENDING' } }),
      db.branchTransfer.count({ where: { status: 'PENDING_RECEIPT' } }),
      db.branchTransfer.count({ where: { status: 'RECEIVED' } }),
      db.payoutRequest.count({ where: { status: 'PENDING' } }),
      db.flyerRequest.count({ where: { status: 'PENDING' } }),
      db.shipment.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true } },
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
        },
      }),
    ])

    // Shipment movement chart data (last 7 days)
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(d.getDate() + 1)
      const [count, delivered] = await Promise.all([
        db.shipment.count({ where: { createdAt: { gte: d, lt: next } } }),
        db.shipment.count({ where: { deliveredAt: { gte: d, lt: next } } }),
      ])
      days.push({
        date: d.toISOString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        shipments: count,
        delivered,
      })
    }

    const statusCounts = await db.shipment.groupBy({
      by: ['status'],
      _count: { status: true },
    })
    const statusDistribution = statusCounts.map(s => ({
      name: s.status.replace(/_/g, ' '),
      value: s._count.status,
    }))

    const topClients = await db.client.findMany({
      take: 5,
      orderBy: { totalShipments: 'desc' },
      select: { id: true, companyName: true, totalShipments: true, codCollected: true, rating: true },
    })

    return NextResponse.json({
      stats: {
        totalShipments,
        todayShipments,
        pendingCod: pendingCodAgg._sum.codAmount || 0,
        readyToPay: readyToPayAgg._sum.codAmount || 0,
        paidCod: paidCodAgg._sum.codAmount || 0,
        totalClients,
        activeDrivers,
        totalBranches,
        pendingPickups,
        pendingTransfers,
        receivedTransfers,
        payoutRequests,
        flyerRequests,
      },
      chart: { days, statusDistribution },
      topClients,
      recentShipments: recentShipments.map(s => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        client: s.client.companyName,
        from: s.senderCity.name,
        to: s.recipientCity.name,
        status: s.status,
        codAmount: s.codAmount,
        createdAt: s.createdAt,
      })),
    })
  } catch (e: any) {
    console.error('Admin dashboard error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
