import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateTrackingNumber } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')
    const limit = Math.min(100, Number(searchParams.get('limit') || 50))
    const page = Number(searchParams.get('page') || 1)
    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search } },
        { recipientName: { contains: search } },
        { recipientPhone: { contains: search } },
      ]
    }

    // Role-based filtering
    if (user.role === 'CLIENT') {
      where.clientId = user.clientId
    } else if (user.role === 'DRIVER') {
      where.driverId = user.driverId
    }

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          client: { select: { id: true, companyName: true } },
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
          driver: { select: { id: true, driverCode: true, user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.shipment.count({ where }),
    ])

    return NextResponse.json({
      shipments: shipments.map((s) => ({
        id: s.id,
        trackingNumber: s.trackingNumber,
        client: s.client.companyName,
        clientId: s.client.id,
        senderCity: s.senderCity.name,
        recipientCity: s.recipientCity.name,
        recipientName: s.recipientName,
        recipientPhone: s.recipientPhone,
        status: s.status,
        paymentStatus: s.paymentStatus,
        serviceType: s.serviceType,
        priority: s.priority,
        weight: s.weight,
        pieces: s.pieces,
        codAmount: s.codAmount,
        shippingCost: s.shippingCost,
        description: s.description,
        driver: s.driver ? { name: s.driver.user.fullName, code: s.driver.driverCode } : null,
        createdAt: s.createdAt,
        deliveredAt: s.deliveredAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e: any) {
    console.error('Shipments list error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Validate required fields
    const required = ['clientId', 'senderName', 'senderPhone', 'senderCityId', 'recipientName', 'recipientPhone', 'recipientAddress', 'recipientCityId']
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 })
    }

    const trackingNumber = generateTrackingNumber()

    // Calculate pricing
    const codAmount = Number(body.codAmount) || 0
    const shippingCost = Number(body.shippingCost) || 25
    const codFee = Math.round(codAmount * 0.02 * 100) / 100
    const totalCost = shippingCost + codFee

    const shipment = await db.shipment.create({
      data: {
        trackingNumber,
        clientId: body.clientId,
        createdById: user.id,
        senderName: body.senderName,
        senderPhone: body.senderPhone,
        senderAddress: body.senderAddress || '',
        senderCityId: body.senderCityId,
        fromBranchId: body.fromBranchId || null,
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        recipientAddress: body.recipientAddress,
        recipientCityId: body.recipientCityId,
        toBranchId: body.toBranchId || null,
        type: body.type || 'DELIVERY',
        serviceType: body.serviceType || 'STANDARD',
        weight: Number(body.weight) || 0.5,
        pieces: Number(body.pieces) || 1,
        description: body.description || null,
        shippingCost,
        codAmount,
        codFee,
        insuranceFee: 0,
        totalCost,
        driverId: body.driverId || null,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        priority: body.priority || 'NORMAL',
      },
    })

    // Initial status history
    await db.shipmentStatus.create({
      data: {
        shipmentId: shipment.id,
        status: 'PENDING',
        note: 'Shipment created',
        createdBy: user.id,
      },
    })

    // Update client counters
    await db.client.update({
      where: { id: body.clientId },
      data: { totalShipments: { increment: 1 }, activeShipments: { increment: 1 } },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Shipment',
        entityId: shipment.id,
        afterData: JSON.stringify({ trackingNumber }),
      },
    })

    return NextResponse.json({ shipment, trackingNumber }, { status: 201 })
  } catch (e: any) {
    console.error('Shipment create error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
