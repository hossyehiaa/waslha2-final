import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rules = await db.pricingRule.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        serviceType: r.serviceType,
        baseWeight: r.baseWeight,
        basePrice: r.basePrice,
        perKgPrice: r.perKgPrice,
        codFeePercent: r.codFeePercent,
        insuranceFeePercent: r.insuranceFeePercent,
        status: r.status,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
