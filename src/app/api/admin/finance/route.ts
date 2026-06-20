import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') where.status = status

    // Clients see only their settlements
    if (user.role === 'CLIENT') {
      where.clientId = user.clientId
    } else if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settlements = await db.codSettlement.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalPending = await db.codSettlement.aggregate({
      _sum: { netAmount: true },
      where: { status: 'PENDING' },
    })
    const totalPaid = await db.codSettlement.aggregate({
      _sum: { netAmount: true },
      where: { status: 'PAID' },
    })

    return NextResponse.json({
      settlements: settlements.map((s) => ({
        id: s.id,
        reference: s.reference,
        client: s.client.companyName,
        clientId: s.client.id,
        period: s.period,
        totalAmount: s.totalAmount,
        fees: s.fees,
        netAmount: s.netAmount,
        shipmentCount: s.shipmentCount,
        status: s.status,
        paidAt: s.paidAt,
        createdAt: s.createdAt,
      })),
      totals: {
        pending: totalPending._sum.netAmount || 0,
        paid: totalPaid._sum.netAmount || 0,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, action } = body

    if (action === 'approve') {
      const updated = await db.codSettlement.update({
        where: { id },
        data: { status: 'APPROVED' },
      })
      await db.auditLog.create({
        data: { userId: user.id, action: 'UPDATE', entity: 'CodSettlement', entityId: id, afterData: JSON.stringify({ status: 'APPROVED' }) },
      })
      return NextResponse.json({ settlement: updated })
    }

    if (action === 'pay') {
      const settlement = await db.codSettlement.findUnique({ where: { id } })
      if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await db.codSettlement.update({
        where: { id },
        data: { status: 'PAID', paidAt: new Date() },
      })

      // Update client balances
      await db.client.update({
        where: { id: settlement.clientId },
        data: {
          codPaid: { increment: settlement.netAmount },
          codPending: { decrement: settlement.netAmount },
        },
      })

      // Mark related shipments as settled
      await db.shipment.updateMany({
        where: {
          clientId: settlement.clientId,
          paymentStatus: 'COLLECTED',
        },
        data: {
          paymentStatus: 'SETTLED',
          codSettledAt: new Date(),
          settlementId: settlement.id,
        },
      })

      await db.auditLog.create({
        data: { userId: user.id, action: 'UPDATE', entity: 'CodSettlement', entityId: id, afterData: JSON.stringify({ status: 'PAID' }) },
      })

      return NextResponse.json({ settlement: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
