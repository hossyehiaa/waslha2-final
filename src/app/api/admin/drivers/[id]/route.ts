import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const driver = await db.driver.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const userUpdate: any = {}
    if (body.fullName) userUpdate.fullName = sanitizeInput(body.fullName)
    if (body.email !== undefined) userUpdate.email = body.email ? sanitizeInput(body.email).toLowerCase() : null
    if (body.phone !== undefined) userUpdate.phone = sanitizeInput(body.phone)
    if (body.password) userUpdate.passwordHash = await hashPassword(body.password)
    if (body.status) userUpdate.status = body.status

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({
        where: { id: driver.userId },
        data: userUpdate,
      })
    }

    const drvUpdate: any = {}
    if (body.vehicleType) drvUpdate.vehicleType = body.vehicleType
    if (body.vehiclePlate !== undefined) drvUpdate.vehiclePlate = sanitizeInput(body.vehiclePlate || '')
    if (body.branchId !== undefined) drvUpdate.branchId = body.branchId || null
    if (body.zoneId !== undefined) drvUpdate.zoneId = body.zoneId || null

    if (Object.keys(drvUpdate).length > 0) {
      await db.driver.update({
        where: { id },
        data: drvUpdate,
      })
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Driver',
        entityId: id,
        afterData: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const driver = await db.driver.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!driver) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (driver.userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    await db.driver.delete({ where: { id } })
    await db.user.delete({ where: { id: driver.userId } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Driver',
        entityId: id,
        beforeData: JSON.stringify({ fullName: driver.user.fullName, driverCode: driver.driverCode }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
