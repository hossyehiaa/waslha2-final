import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateTrackingNumber } from '@/lib/auth-helpers'
import { calculateShippingCost } from '@/lib/partner-api'

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
      if (!user.clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 403 })
      where.clientId = user.clientId
    } else if (user.role === 'DRIVER') {
      if (!user.driverId) return NextResponse.json({ error: 'Driver account is required' }, { status: 403 })
      where.driverId = user.driverId
    } else if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    if (user.role === 'DRIVER' || (user.role !== 'CLIENT' && user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientId = user.role === 'CLIENT' ? user.clientId : body.clientId
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })

    // Validate required fields. clientId is always derived from the session for CLIENT accounts.
    const required = ['senderName', 'senderPhone', 'senderCityId', 'recipientName', 'recipientPhone', 'recipientAddress', 'recipientCityId']
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 })
    }

    const [senderCity, recipientCity] = await Promise.all([
      db.city.findFirst({ where: { status: 'ACTIVE', OR: [{ id: String(body.senderCityId) }, { code: String(body.senderCityId).trim().toUpperCase() }] } }),
      db.city.findFirst({ where: { status: 'ACTIVE', OR: [{ id: String(body.recipientCityId) }, { code: String(body.recipientCityId).trim().toUpperCase() }] } }),
    ])
    if (!senderCity || !recipientCity) return NextResponse.json({ error: 'Sender or recipient city is invalid' }, { status: 400 })

    const serviceType = body.serviceType === 'EXPRESS' || body.serviceType === 'SAME_DAY' ? body.serviceType : 'STANDARD'
    const priority = body.priority === 'LOW' || body.priority === 'HIGH' || body.priority === 'URGENT' ? body.priority : 'NORMAL'
    const shipmentType = body.type === 'RETURN' || body.type === 'EXCHANGE' ? body.type : 'DELIVERY'
    const weight = Math.min(1000, Math.max(0.1, Number(body.weight) || 0.5))
    const pieces = Math.min(1000, Math.max(1, Math.floor(Number(body.pieces) || 1)))
    const codAmount = Math.min(100000000, Math.max(0, Number(body.codAmount) || 0))
    const quote = await calculateShippingCost({
      sender: { name: body.senderName, phone: body.senderPhone, address: body.senderAddress || '', cityCode: senderCity.code },
      recipient: { name: body.recipientName, phone: body.recipientPhone, address: body.recipientAddress, cityCode: recipientCity.code },
      serviceType,
      priority,
      weight,
      pieces,
      description: body.description || null,
      codAmount,
    }, senderCity.id, recipientCity.id)

    const trackingNumber = generateTrackingNumber()
    const { shippingCost, codFee, totalCost } = quote
    const allowOperationalAssignments = user.role === 'ADMIN' || user.role === 'EMPLOYEE'
    const shipment = await db.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          trackingNumber,
          clientId,
          createdById: user.id,
          senderName: body.senderName,
          senderPhone: body.senderPhone,
          senderAddress: body.senderAddress || '',
          senderCityId: senderCity.id,
          fromBranchId: allowOperationalAssignments ? body.fromBranchId || null : null,
          recipientName: body.recipientName,
          recipientPhone: body.recipientPhone,
          recipientAddress: body.recipientAddress,
          recipientCityId: recipientCity.id,
          toBranchId: allowOperationalAssignments ? body.toBranchId || null : null,
          type: shipmentType,
          serviceType,
          weight,
          pieces,
          description: body.description || null,
          shippingCost,
          codAmount,
          codFee,
          insuranceFee: 0,
          totalCost,
          driverId: allowOperationalAssignments ? body.driverId || null : null,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          priority,
        },
      })

      await tx.shipmentStatus.create({
        data: { shipmentId: created.id, status: 'PENDING', note: 'Shipment created', createdBy: user.id },
      })
      await tx.client.update({
        where: { id: clientId },
        data: { totalShipments: { increment: 1 }, activeShipments: { increment: 1 } },
      })
      await tx.auditLog.create({
        data: { userId: user.id, action: 'CREATE', entity: 'Shipment', entityId: created.id, afterData: JSON.stringify({ trackingNumber }) },
      })
      return created
    })

    return NextResponse.json({ shipment, trackingNumber }, { status: 201 })
  } catch (e: any) {
    console.error('Shipment create error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
