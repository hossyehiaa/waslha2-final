import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        senderCity: { select: { name: true } },
        recipientCity: { select: { name: true } },
        fromBranch: { select: { name: true } },
        toBranch: { select: { name: true } },
        driver: { include: { user: { select: { fullName: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Permission check
    if (user.role === 'CLIENT' && shipment.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ shipment })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - update shipment details (admin can edit everything)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const shipment = await db.shipment.findUnique({ where: { id } })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Permission check - clients can only edit their own shipments
    if (user.role === 'CLIENT' && shipment.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}

    // Editable fields
    if (body.recipientName !== undefined) updateData.recipientName = body.recipientName
    if (body.recipientPhone !== undefined) updateData.recipientPhone = body.recipientPhone
    if (body.recipientAddress !== undefined) updateData.recipientAddress = body.recipientAddress
    if (body.recipientCityId !== undefined) updateData.recipientCityId = body.recipientCityId
    if (body.senderName !== undefined) updateData.senderName = body.senderName
    if (body.senderPhone !== undefined) updateData.senderPhone = body.senderPhone
    if (body.senderAddress !== undefined) updateData.senderAddress = body.senderAddress
    if (body.senderCityId !== undefined) updateData.senderCityId = body.senderCityId
    if (body.weight !== undefined) updateData.weight = Number(body.weight)
    if (body.pieces !== undefined) updateData.pieces = Number(body.pieces)
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.serviceType !== undefined) updateData.serviceType = body.serviceType
    if (body.type !== undefined) updateData.type = body.type
    if (body.driverId !== undefined) updateData.driverId = body.driverId || null
    if (body.fromBranchId !== undefined) updateData.fromBranchId = body.fromBranchId || null
    if (body.toBranchId !== undefined) updateData.toBranchId = body.toBranchId || null

    // Recalculate pricing if COD changed
    if (body.codAmount !== undefined) {
      const codAmount = Number(body.codAmount) || 0
      const codFee = Math.round(codAmount * 0.02 * 100) / 100
      updateData.codAmount = codAmount
      updateData.codFee = codFee
      updateData.totalCost = shipment.shippingCost + codFee
    }

    if (body.shippingCost !== undefined) {
      const shippingCost = Number(body.shippingCost) || 0
      updateData.shippingCost = shippingCost
      updateData.totalCost = shippingCost + (updateData.codFee ?? shipment.codFee)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.shipment.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Shipment',
        entityId: id,
        afterData: JSON.stringify(body),
      },
    })

    return NextResponse.json({ shipment: updated })
  } catch (e: any) {
    console.error('Shipment update error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
