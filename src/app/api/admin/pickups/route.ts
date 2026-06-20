import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const where: any = {}
    if (user.role === 'CLIENT') where.clientId = user.clientId

    const pickups = await db.pickupRequest.findMany({
      where,
      include: {
        client: { select: { companyName: true, user: { select: { fullName: true } } } },
        driver: { select: { id: true, driverCode: true, user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      pickups: pickups.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        clientName: p.client.companyName,
        pickupAddress: p.pickupAddress,
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        packagesCount: p.packagesCount,
        totalWeight: p.totalWeight,
        status: p.status,
        requestedDate: p.requestedDate,
        scheduledDate: p.scheduledDate,
        completedDate: p.completedDate,
        notes: p.notes,
        driverId: p.driverId,
        driverName: p.driver?.user.fullName,
        driverCode: p.driver?.driverCode,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Clients can create their own pickup requests
    if (user.role === 'CLIENT') {
      body.clientId = user.clientId
    } else if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!body.clientId || !body.pickupAddress || !body.contactName || !body.contactPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const pickup = await db.pickupRequest.create({
      data: {
        clientId: body.clientId,
        pickupAddress: body.pickupAddress,
        pickupCityId: body.pickupCityId || body.cityId,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        packagesCount: Number(body.packagesCount) || 1,
        totalWeight: Number(body.totalWeight) || 0,
        requestedDate: body.requestedDate ? new Date(body.requestedDate) : new Date(),
        notes: body.notes || null,
        status: 'PENDING',
      },
    })

    // Notify admin
    const admins = await db.user.findMany({ where: { role: 'ADMIN' } })
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'PICKUP',
          title: 'New Pickup Request',
          message: `New pickup request from ${body.contactName} at ${body.pickupAddress}`,
          isRead: false,
          link: '/admin/pickups',
        },
      })
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'PickupRequest',
        entityId: pickup.id,
      },
    })

    return NextResponse.json({ pickup }, { status: 201 })
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

    const { id, action, driverId, scheduledDate } = await req.json()

    const pickup = await db.pickupRequest.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    })
    if (!pickup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}

    if (action === 'confirm') {
      updateData.status = 'CONFIRMED'
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : new Date()
    } else if (action === 'assign') {
      if (!driverId) return NextResponse.json({ error: 'Driver ID required' }, { status: 400 })
      updateData.status = 'ASSIGNED'
      updateData.driverId = driverId
    } else if (action === 'pickup') {
      updateData.status = 'PICKED_UP'
      updateData.completedDate = new Date()
    } else if (action === 'cancel') {
      updateData.status = 'CANCELLED'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await db.pickupRequest.update({
      where: { id },
      data: updateData,
    })

    // Notify client
    if (pickup.client?.userId) {
      const messages: Record<string, string> = {
        CONFIRMED: `Your pickup request has been confirmed and scheduled`,
        ASSIGNED: `A driver has been assigned to your pickup request`,
        PICKED_UP: `Your packages have been picked up successfully`,
        CANCELLED: `Your pickup request has been cancelled`,
      }
      if (messages[action]) {
        await db.notification.create({
          data: {
            userId: pickup.client.userId,
            type: 'PICKUP',
            title: 'Pickup Update',
            message: messages[action],
            isRead: false,
            link: '/dashboard/pickups',
          },
        })
      }
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'PickupRequest',
        entityId: id,
        afterData: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ pickup: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
