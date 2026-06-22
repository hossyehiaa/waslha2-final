import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTrackingNumber } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// Authenticate via API key
async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const key = authHeader.substring(7)
  const apiKey = await db.apiKey.findUnique({
    where: { key, isActive: true },
    include: { client: true },
  })
  if (!apiKey) return null

  // Update last used
  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey
}

// GET - list shipments for the authenticated client
export async function GET(req: NextRequest) {
  try {
    const apiKey = await authenticate(req)
    if (!apiKey) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Math.min(100, Number(searchParams.get('limit') || 50))
    const page = Number(searchParams.get('page') || 1)
    const skip = (page - 1) * limit

    const where: any = { clientId: apiKey.clientId }
    if (status) where.status = status

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: {
          senderCity: { select: { name: true } },
          recipientCity: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.shipment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: shipments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - create a new shipment
export async function POST(req: NextRequest) {
  try {
    const apiKey = await authenticate(req)
    if (!apiKey) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

    // Check scopes
    if (!apiKey.scopes.includes('shipments:write')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()

    // Validate required fields
    const required = ['senderName', 'senderPhone', 'senderCityId', 'recipientName', 'recipientPhone', 'recipientAddress', 'recipientCityId']
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 })
    }

    const trackingNumber = generateTrackingNumber()
    const codAmount = Number(body.codAmount) || 0
    const shippingCost = Number(body.shippingCost) || 25
    const codFee = Math.round(codAmount * 0.02 * 100) / 100

    const shipment = await db.shipment.create({
      data: {
        trackingNumber,
        clientId: apiKey.clientId,
        createdById: apiKey.client.userId,
        senderName: body.senderName,
        senderPhone: body.senderPhone,
        senderAddress: body.senderAddress || '',
        senderCityId: body.senderCityId,
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        recipientAddress: body.recipientAddress,
        recipientCityId: body.recipientCityId,
        type: body.type || 'DELIVERY',
        serviceType: body.serviceType || 'STANDARD',
        weight: Number(body.weight) || 0.5,
        pieces: Number(body.pieces) || 1,
        description: body.description || null,
        shippingCost,
        codAmount,
        codFee,
        totalCost: shippingCost + codFee,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
    })

    // Update client counters
    await db.client.update({
      where: { id: apiKey.clientId },
      data: { totalShipments: { increment: 1 }, activeShipments: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      data: { id: shipment.id, trackingNumber: shipment.trackingNumber, status: shipment.status },
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
