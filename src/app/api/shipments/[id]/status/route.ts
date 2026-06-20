import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

const VALID_STATUSES = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { status, note } = body

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const shipment = await db.shipment.findUnique({ where: { id } })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Add to history
    await db.shipmentStatus.create({
      data: {
        shipmentId: id,
        status,
        note: note || `Status updated by ${user.fullName}`,
        createdBy: user.id,
      },
    })

    // Update shipment
    const updateData: any = { status }
    if (status === 'PICKED_UP' && !shipment.pickupAt) updateData.pickupAt = new Date()
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
      updateData.paymentStatus = shipment.paymentStatus === 'PENDING' ? 'COLLECTED' : shipment.paymentStatus
      updateData.codCollectedAt = new Date()
    }

    const updated = await db.shipment.update({
      where: { id },
      data: updateData,
    })

    // Audit
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Shipment',
        entityId: id,
        afterData: JSON.stringify({ status }),
      },
    })

    return NextResponse.json({ shipment: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
