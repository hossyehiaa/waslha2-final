import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const rule = await db.pricingRule.findUnique({ where: { id } })
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.name) updateData.name = sanitizeInput(body.name)
    if (body.serviceType) updateData.serviceType = body.serviceType
    if (body.baseWeight !== undefined) updateData.baseWeight = Number(body.baseWeight)
    if (body.basePrice !== undefined) updateData.basePrice = Number(body.basePrice)
    if (body.perKgPrice !== undefined) updateData.perKgPrice = Number(body.perKgPrice)
    if (body.codFeePercent !== undefined) updateData.codFeePercent = Number(body.codFeePercent)
    if (body.insuranceFeePercent !== undefined) updateData.insuranceFeePercent = Number(body.insuranceFeePercent)
    if (body.status) updateData.status = body.status

    await db.pricingRule.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'PricingRule',
        entityId: id,
        afterData: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const rule = await db.pricingRule.findUnique({ where: { id } })
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.pricingRule.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'PricingRule',
        entityId: id,
        beforeData: JSON.stringify({ name: rule.name }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
