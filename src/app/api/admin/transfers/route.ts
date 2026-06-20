import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateReference } from '@/lib/auth-helpers'

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
        fromBranchId: t.fromBranchId,
        toBranch: t.toBranch.name,
        toBranchId: t.toBranchId,
        shipmentCount: t.shipmentCount,
        totalValue: t.totalValue,
        status: t.status,
        sentAt: t.sentAt,
        receivedAt: t.receivedAt,
        notes: t.notes,
        createdAt: t.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { fromBranchId, toBranchId, shipmentIds, notes } = body

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json({ error: 'From and to branches required' }, { status: 400 })
    }
    if (fromBranchId === toBranchId) {
      return NextResponse.json({ error: 'Cannot transfer to same branch' }, { status: 400 })
    }
    if (!shipmentIds || shipmentIds.length === 0) {
      return NextResponse.json({ error: 'At least one shipment required' }, { status: 400 })
    }

    // Get shipments
    const shipments = await db.shipment.findMany({
      where: { id: { in: shipmentIds }, fromBranchId },
    })

    if (shipments.length === 0) {
      return NextResponse.json({ error: 'No valid shipments found' }, { status: 400 })
    }

    const totalValue = shipments.reduce((s, x) => s + x.codAmount, 0)
    const reference = generateReference('TRF')

    const transfer = await db.branchTransfer.create({
      data: {
        reference,
        fromBranchId,
        toBranchId,
        shipmentCount: shipments.length,
        totalValue,
        status: 'PENDING_RECEIPT',
        sentAt: new Date(),
        notes: notes || null,
      },
    })

    // Update shipments - mark as in transfer
    await db.shipment.updateMany({
      where: { id: { in: shipmentIds } },
      data: {
        status: 'IN_TRANSIT',
        fromBranchId: toBranchId, // will arrive at destination
      },
    })

    // Add status history
    for (const s of shipments) {
      await db.shipmentStatus.create({
        data: {
          shipmentId: s.id,
          status: 'IN_TRANSIT',
          note: `Transferred from ${reference}`,
          createdBy: user.id,
        },
      })
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'BranchTransfer',
        entityId: transfer.id,
        afterData: JSON.stringify({ reference, shipmentCount: shipments.length, totalValue }),
      },
    })

    return NextResponse.json({ transfer }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action } = await req.json()

    const transfer = await db.branchTransfer.findUnique({ where: { id } })
    if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'receive') {
      if (transfer.status !== 'PENDING_RECEIPT') {
        return NextResponse.json({ error: 'Transfer is not pending receipt' }, { status: 400 })
      }

      const updated = await db.branchTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      })

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          entity: 'BranchTransfer',
          entityId: id,
          afterData: JSON.stringify({ status: 'RECEIVED' }),
        },
      })

      return NextResponse.json({ transfer: updated })
    }

    if (action === 'cancel') {
      if (transfer.status !== 'PENDING_RECEIPT') {
        return NextResponse.json({ error: 'Cannot cancel received transfer' }, { status: 400 })
      }

      const updated = await db.branchTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      })

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'UPDATE',
          entity: 'BranchTransfer',
          entityId: id,
          afterData: JSON.stringify({ status: 'CANCELLED' }),
        },
      })

      return NextResponse.json({ transfer: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
