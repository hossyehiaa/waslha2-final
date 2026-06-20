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
    const { id, action, clientId, period } = body

    // Create a new settlement from collected COD shipments
    if (action === 'create') {
      if (!clientId) return NextResponse.json({ error: 'Client ID required' }, { status: 400 })

      // Find all COLLECTED shipments for this client that haven't been settled
      const shipments = await db.shipment.findMany({
        where: {
          clientId,
          paymentStatus: 'COLLECTED',
          status: 'DELIVERED',
        },
      })

      if (shipments.length === 0) {
        return NextResponse.json({ error: 'No collected shipments to settle' }, { status: 400 })
      }

      const totalAmount = shipments.reduce((s, x) => s + x.codAmount, 0)
      const fees = shipments.reduce((s, x) => s + x.codFee, 0)
      const netAmount = totalAmount - fees

      const reference = `COD-${Date.now().toString(36).toUpperCase()}`
      const settlement = await db.codSettlement.create({
        data: {
          clientId,
          reference,
          period: period || new Date().toISOString().slice(0, 7),
          totalAmount,
          fees,
          netAmount,
          shipmentCount: shipments.length,
          status: 'PENDING',
        },
      })

      // Link shipments to this settlement
      await db.shipment.updateMany({
        where: { id: { in: shipments.map(s => s.id) } },
        data: { settlementId: settlement.id },
      })

      await db.auditLog.create({
        data: { userId: user.id, action: 'CREATE', entity: 'CodSettlement', entityId: settlement.id, afterData: JSON.stringify({ reference, totalAmount, netAmount }) },
      })

      return NextResponse.json({ settlement }, { status: 201 })
    }

    if (action === 'approve') {
      const settlement = await db.codSettlement.findUnique({
        where: { id },
        include: { client: { include: { user: true } } },
      })
      if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await db.codSettlement.update({
        where: { id },
        data: { status: 'APPROVED' },
      })

      // Notify client
      if (settlement.client?.userId) {
        await db.notification.create({
          data: {
            userId: settlement.client.userId,
            type: 'PAYMENT',
            title: 'COD Settlement Approved',
            message: `Your settlement ${settlement.reference} for ${settlement.netAmount} EGP has been approved`,
            isRead: false,
            link: '/dashboard/cod',
          },
        })
      }

      await db.auditLog.create({
        data: { userId: user.id, action: 'UPDATE', entity: 'CodSettlement', entityId: id, afterData: JSON.stringify({ status: 'APPROVED' }) },
      })
      return NextResponse.json({ settlement: updated })
    }

    if (action === 'pay') {
      const settlement = await db.codSettlement.findUnique({
        where: { id },
        include: { client: { include: { user: true } } },
      })
      if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      if (settlement.status === 'PAID') {
        return NextResponse.json({ error: 'Settlement already paid' }, { status: 400 })
      }

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
          codBalance: { decrement: settlement.netAmount },
        },
      })

      // Mark related shipments as settled
      await db.shipment.updateMany({
        where: {
          clientId: settlement.clientId,
          settlementId: settlement.id,
        },
        data: {
          paymentStatus: 'SETTLED',
          codSettledAt: new Date(),
        },
      })

      // Notify client
      if (settlement.client?.userId) {
        await db.notification.create({
          data: {
            userId: settlement.client.userId,
            type: 'PAYMENT',
            title: 'COD Settlement Paid',
            message: `Your settlement ${settlement.reference} of ${settlement.netAmount} EGP has been paid to your account`,
            isRead: false,
            link: '/dashboard/cod',
          },
        })
      }

      await db.auditLog.create({
        data: { userId: user.id, action: 'UPDATE', entity: 'CodSettlement', entityId: id, afterData: JSON.stringify({ status: 'PAID' }) },
      })

      return NextResponse.json({ settlement: updated })
    }

    if (action === 'cancel') {
      const settlement = await db.codSettlement.findUnique({ where: { id } })
      if (!settlement) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (settlement.status === 'PAID') {
        return NextResponse.json({ error: 'Cannot cancel paid settlement' }, { status: 400 })
      }

      const updated = await db.codSettlement.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      // Unlink shipments
      await db.shipment.updateMany({
        where: { settlementId: id },
        data: { settlementId: null },
      })

      await db.auditLog.create({
        data: { userId: user.id, action: 'UPDATE', entity: 'CodSettlement', entityId: id, afterData: JSON.stringify({ status: 'CANCELLED' }) },
      })

      return NextResponse.json({ settlement: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Finance PATCH error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
