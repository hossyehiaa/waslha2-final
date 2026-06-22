import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q) return NextResponse.json({ error: 'Tracking number required' }, { status: 400 })

    const shipment = await db.shipment.findFirst({
      where: {
        OR: [
          { trackingNumber: { contains: q } },
        ],
      },
      include: {
        senderCity: true,
        recipientCity: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    return NextResponse.json({
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      type: shipment.type,
      serviceType: shipment.serviceType,
      description: shipment.description,
      weight: shipment.weight,
      pieces: shipment.pieces,
      from: shipment.senderCity.name,
      to: shipment.recipientCity.name,
      createdAt: shipment.createdAt,
      deliveredAt: shipment.deliveredAt,
      history: shipment.statusHistory.map((h) => ({
        status: h.status,
        note: h.note,
        location: h.location,
        createdAt: h.createdAt,
      })),
    })
  } catch (e: any) {
    console.error('Track error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
