import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET - list loyalty points and tiers
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId') || (user.role === 'CLIENT' ? user.clientId : null)

    if (!clientId) {
      // Admin: list all clients with their points
      const clients = await db.client.findMany({
        include: {
          loyaltyPoints: { orderBy: { createdAt: 'desc' }, take: 5 },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const tiers = await db.loyaltyTier.findMany({ orderBy: { minPoints: 'asc' } })

      // Calculate total points per client
      const clientsWithPoints = await Promise.all(
        clients.map(async (c) => {
          const totalPoints = await db.loyaltyPoint.aggregate({
            _sum: { points: true },
            where: { clientId: c.id },
          })
          const total = totalPoints._sum.points || 0
          const tier = tiers.find(t => total >= t.minPoints) || tiers[0]
          return {
            id: c.id,
            companyName: c.companyName,
            totalShipments: c.totalShipments,
            totalPoints: total,
            tier: tier?.name || 'None',
            tierColor: tier?.color || '#888888',
            recentPoints: c.loyaltyPoints,
          }
        })
      )

      return NextResponse.json({ clients: clientsWithPoints, tiers })
    }

    // Client view: get own points
    const [points, totalAgg, tiers] = await Promise.all([
      db.loyaltyPoint.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.loyaltyPoint.aggregate({
        _sum: { points: true },
        where: { clientId },
      }),
      db.loyaltyTier.findMany({ orderBy: { minPoints: 'asc' } }),
    ])

    const total = totalAgg._sum.points || 0
    const currentTier = tiers.find(t => total >= t.minPoints) || tiers[0]
    const nextTier = tiers.find(t => t.minPoints > total)

    return NextResponse.json({
      totalPoints: total,
      currentTier,
      nextTier,
      pointsToNextTier: nextTier ? nextTier.minPoints - total : 0,
      history: points,
      tiers,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - award or redeem points (admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { clientId, points, reason, shipmentId } = await req.json()
    if (!clientId || !points || !reason) {
      return NextResponse.json({ error: 'clientId, points, and reason required' }, { status: 400 })
    }

    const point = await db.loyaltyPoint.create({
      data: {
        clientId,
        points: Number(points),
        reason,
        shipmentId: shipmentId || null,
      },
    })

    return NextResponse.json({ point }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
