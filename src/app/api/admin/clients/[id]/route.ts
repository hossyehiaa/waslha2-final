import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    const client = await db.client.findUnique({ where: { id } })
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.companyName) updateData.companyName = sanitizeInput(body.companyName)
    if (body.address !== undefined) updateData.address = sanitizeInput(body.address || '')
    if (body.cityId !== undefined) updateData.cityId = body.cityId || null
    if (body.branchId !== undefined) updateData.branchId = body.branchId || null
    if (body.creditLimit !== undefined) updateData.creditLimit = Number(body.creditLimit) || 0
    if (body.taxNumber !== undefined) updateData.taxNumber = sanitizeInput(body.taxNumber || '')
    if (body.commercialReg !== undefined) updateData.commercialReg = sanitizeInput(body.commercialReg || '')
    if (body.status) updateData.status = body.status

    // Also update user fields
    const userUpdate: any = {}
    if (body.fullName) userUpdate.fullName = sanitizeInput(body.fullName)
    if (body.email !== undefined) userUpdate.email = body.email || null
    if (body.phone !== undefined) userUpdate.phone = sanitizeInput(body.phone || '')
    if (body.status) userUpdate.status = body.status

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({ where: { id: client.userId }, data: userUpdate })
    }

    const updated = await db.client.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: { userId: user.id, action: 'UPDATE', entity: 'Client', entityId: id, afterData: JSON.stringify(body) },
    })

    return NextResponse.json({ client: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const client = await db.client.findUnique({ where: { id }, include: { user: true } })
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check if client has shipments
    const shipmentCount = await db.shipment.count({ where: { clientId: id } })
    if (shipmentCount > 0) {
      return NextResponse.json({ error: `Cannot delete client with ${shipmentCount} shipments. Archive instead.` }, { status: 400 })
    }

    await db.client.delete({ where: { id } })
    await db.user.delete({ where: { id: client.userId } })

    await db.auditLog.create({
      data: { userId: user.id, action: 'DELETE', entity: 'Client', entityId: id },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
