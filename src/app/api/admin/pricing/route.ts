import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = sanitizeInput(body.name || '')
    const serviceType = body.serviceType || 'STANDARD'
    const baseWeight = Number(body.baseWeight) || 0.5
    const basePrice = Number(body.basePrice) || 0
    const perKgPrice = Number(body.perKgPrice) || 0
    const codFeePercent = Number(body.codFeePercent) || 0
    const insuranceFeePercent = Number(body.insuranceFeePercent) || 0

    if (!name) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const rule = await db.pricingRule.create({
      data: { name, serviceType, baseWeight, basePrice, perKgPrice, codFeePercent, insuranceFeePercent, status: 'ACTIVE' },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'PricingRule',
        entityId: rule.id,
        afterData: JSON.stringify({ name, serviceType }),
      },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
