import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requests = await db.flyerRequest.findMany({
      include: { client: { select: { companyName: true, user: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.companyName,
        quantity: r.quantity,
        type: r.type,
        notes: r.notes,
        status: r.status,
        createdAt: r.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action } = await req.json()
    const newStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : action === 'fulfill' ? 'FULFILLED' : null
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const request = await db.flyerRequest.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    })
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await db.flyerRequest.update({
      where: { id },
      data: { status: newStatus },
    })

    // Notify client
    if (request.client?.userId) {
      const messages: Record<string, { title: string; message: string }> = {
        APPROVED: { title: 'Flyer Request Approved', message: `Your request for ${request.quantity} flyers has been approved` },
        REJECTED: { title: 'Flyer Request Rejected', message: `Your request for ${request.quantity} flyers has been rejected` },
        FULFILLED: { title: 'Flyers Delivered', message: `Your ${request.quantity} flyers have been delivered` },
      }
      const msg = messages[newStatus]
      if (msg) {
        await db.notification.create({
          data: {
            userId: request.client.userId,
            type: 'SYSTEM',
            title: msg.title,
            message: msg.message,
            isRead: false,
            link: '/dashboard/notifications',
          },
        })
      }
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'FlyerRequest',
        entityId: id,
        afterData: JSON.stringify({ status: newStatus }),
      },
    })

    return NextResponse.json({ request: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
