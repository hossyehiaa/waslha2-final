import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { calculateShippingCost } from '@/lib/partner-api'

export const runtime = 'nodejs'

/**
 * GET /api/admin/quote
 * Query: senderCityId, recipientCityId, serviceType?, priority?, weight?, codAmount?
 * Returns the suggested shipping price for the route (used by the create
 * shipment form to pre-fill the price — staff can still override it).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE' && user.role !== 'CLIENT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const senderCityId = searchParams.get('senderCityId')
    const recipientCityId = searchParams.get('recipientCityId')
    if (!senderCityId || !recipientCityId) {
      return NextResponse.json({ error: 'senderCityId and recipientCityId are required' }, { status: 400 })
    }

    const [senderCity, recipientCity] = await Promise.all([
      db.city.findFirst({ where: { status: 'ACTIVE', OR: [{ id: senderCityId }, { code: senderCityId.trim().toUpperCase() }] } }),
      db.city.findFirst({ where: { status: 'ACTIVE', OR: [{ id: recipientCityId }, { code: recipientCityId.trim().toUpperCase() }] } }),
    ])
    if (!senderCity || !recipientCity) {
      return NextResponse.json({ error: 'Sender or recipient city is invalid' }, { status: 400 })
    }

    const serviceType = (searchParams.get('serviceType') === 'EXPRESS' || searchParams.get('serviceType') === 'SAME_DAY'
      ? searchParams.get('serviceType')! : 'STANDARD') as 'STANDARD' | 'EXPRESS' | 'SAME_DAY'
    const priority = (['LOW', 'HIGH', 'URGENT'].includes(searchParams.get('priority') || '') ? searchParams.get('priority')! : 'NORMAL') as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    const weight = Math.min(1000, Math.max(0.1, Number(searchParams.get('weight')) || 0.5))
    const codAmount = Math.min(100000000, Math.max(0, Number(searchParams.get('codAmount')) || 0))

    const quote = await calculateShippingCost({
      sender: { name: '', phone: '', address: '', cityCode: senderCity.code },
      recipient: { name: '', phone: '', address: '', cityCode: recipientCity.code },
      serviceType,
      priority,
      weight,
      pieces: 1,
      description: null,
      codAmount,
    }, senderCity.id, recipientCity.id)

    return NextResponse.json({
      shippingCost: quote.shippingCost,
      codFee: 0,
      totalCost: quote.shippingCost,
      route: `${senderCity.name} → ${recipientCity.name}`,
    })
  } catch (e: any) {
    if (e?.code === 'UNPRICED_CITY' || String(e?.message || '').includes('not covered by the active tariff')) {
      return NextResponse.json({ error: 'هذا المسار غير مسعّر بعد — أدخل السعر يدوياً' }, { status: 422 })
    }
    console.error('Quote error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
