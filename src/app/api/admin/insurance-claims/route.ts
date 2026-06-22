import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateReference } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (user.role === 'CLIENT') where.clientId = user.clientId

    const claims = await db.insuranceClaim.findMany({
      where,
      include: {
        client: { select: { companyName: true } },
        shipment: { select: { trackingNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      claims: claims.map(c => ({
        id: c.id,
        claimNumber: c.claimNumber,
        client: c.client.companyName,
        clientId: c.clientId,
        shipment: c.shipment.trackingNumber,
        shipmentId: c.shipmentId,
        type: c.type,
        description: c.description,
        claimedAmount: c.claimedAmount,
        approvedAmount: c.approvedAmount,
        status: c.status,
        notes: c.notes,
        createdAt: c.createdAt,
        processedAt: c.processedAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { shipmentId, type, description, claimedAmount, evidenceUrls } = body

    if (!shipmentId || !type || !description || !claimedAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const shipment = await db.shipment.findUnique({
      where: { id: shipmentId },
      include: { client: true },
    })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

    // Permission check
    if (user.role === 'CLIENT' && shipment.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const claimNumber = generateReference('CLM')
    const claim = await db.insuranceClaim.create({
      data: {
        shipmentId,
        clientId: shipment.clientId,
        claimNumber,
        type,
        description,
        claimedAmount: Number(claimedAmount),
        evidenceUrls: JSON.stringify(evidenceUrls || []),
        status: 'PENDING',
      },
    })

    // Notify admin
    const admins = await db.user.findMany({ where: { role: 'ADMIN' } })
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: 'ALERT',
          title: 'New Insurance Claim',
          message: `Claim ${claimNumber} filed for ${claim.claimedAmount} EGP - ${shipment.trackingNumber}`,
          isRead: false,
          link: '/admin/insurance-claims',
        },
      })
    }

    return NextResponse.json({ claim }, { status: 201 })
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

    const { id, action, approvedAmount, notes } = await req.json()

    const claim = await db.insuranceClaim.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    })
    if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {
      processedBy: user.id,
      processedAt: new Date(),
      notes: notes || claim.notes,
    }

    if (action === 'review') updateData.status = 'UNDER_REVIEW'
    else if (action === 'approve') {
      updateData.status = 'APPROVED'
      updateData.approvedAmount = Number(approvedAmount) || claim.claimedAmount
    }
    else if (action === 'reject') updateData.status = 'REJECTED'
    else if (action === 'pay') {
      updateData.status = 'PAID'
      // Add to client's balance
      await db.client.update({
        where: { id: claim.clientId },
        data: { codBalance: { increment: claim.approvedAmount || claim.claimedAmount } },
      })
    }
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const updated = await db.insuranceClaim.update({ where: { id }, data: updateData })

    // Notify client
    if (claim.client?.userId) {
      const messages: Record<string, { title: string; message: string }> = {
        UNDER_REVIEW: { title: 'Claim Under Review', message: `Your claim ${claim.claimNumber} is under review` },
        APPROVED: { title: 'Claim Approved', message: `Your claim ${claim.claimNumber} has been approved for ${updateData.approvedAmount || claim.approvedAmount} EGP` },
        REJECTED: { title: 'Claim Rejected', message: `Your claim ${claim.claimNumber} has been rejected` },
        PAID: { title: 'Claim Paid', message: `Your claim ${claim.claimNumber} has been paid` },
      }
      const msg = messages[updateData.status]
      if (msg) {
        await db.notification.create({
          data: {
            userId: claim.client.userId,
            type: 'ALERT',
            title: msg.title,
            message: msg.message,
            isRead: false,
            link: '/dashboard/insurance-claims',
          },
        })
      }
    }

    return NextResponse.json({ claim: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
