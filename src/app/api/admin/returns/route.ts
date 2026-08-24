import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET /api/admin/returns — list all returns (with shipment + client info)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') where.status = status

    const returns = await db.return.findMany({
      where,
      include: {
        shipment: {
          select: {
            id: true, trackingNumber: true, type: true, codAmount: true,
            recipientName: true, recipientPhone: true,
            client: { select: { id: true, companyName: true } },
            senderCity: { select: { name: true } },
            recipientCity: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      returns: returns.map((r) => ({
        id: r.id,
        shipmentId: r.shipmentId,
        trackingNumber: r.shipment.trackingNumber,
        clientId: r.shipment.client.id,
        client: r.shipment.client.companyName,
        route: `${r.shipment.senderCity?.name || '-'} → ${r.shipment.recipientCity?.name || '-'}`,
        recipient: r.shipment.recipientName,
        phone: r.shipment.recipientPhone,
        codAmount: r.shipment.codAmount,
        reason: r.reason,
        status: r.status,
        condition: r.condition,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/admin/returns
// Body: { ids: string[], action: 'receive'|'deliver'|'dispose', condition?, notes? }
// Single id also accepted for backwards-compat (ids:[id]).
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : (body.id ? [String(body.id)] : [])
    const action = String(body.action || '')
    if (ids.length === 0) return NextResponse.json({ error: 'لم يتم تحديد مرتجعات' }, { status: 400 })

    const condition = ['GOOD', 'DAMAGED', 'LOST'].includes(body.condition) ? body.condition : undefined
    const notes = body.notes ? String(body.notes).slice(0, 500) : undefined

    // Lifecycle: PENDING -> IN_TRANSIT (receive) -> RETURNED_TO_CLIENT (deliver); DISPOSED is terminal
    const transitions: Record<string, string> = {
      receive: 'IN_TRANSIT',
      deliver: 'RETURNED_TO_CLIENT',
      dispose: 'DISPOSED',
    }
    const newStatus = transitions[action]
    if (!newStatus) return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })

    const items = await db.return.findMany({
      where: { id: { in: ids } },
      include: { shipment: { select: { id: true, trackingNumber: true } } },
    })
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const r of items) {
      // Validate transition: cannot move a terminal-state return
      if (r.status === 'DISPOSED' || r.status === 'RETURNED_TO_CLIENT') {
        skipped++
        continue
      }
      // Receive only valid from PENDING; Deliver only valid from IN_TRANSIT (or PENDING)
      if (action === 'receive' && r.status !== 'PENDING') { skipped++; continue }
      if (action === 'deliver' && r.status !== 'IN_TRANSIT' && r.status !== 'PENDING') { skipped++; continue }

      try {
        const data: any = { status: newStatus }
        if (condition) data.condition = condition
        if (notes) data.notes = notes
        await db.return.update({ where: { id: r.id }, data })
        await db.shipmentStatus.create({
          data: {
            shipmentId: r.shipmentId,
            status: newStatus,
            note: `Return ${action} by ${user.fullName}`,
            createdBy: user.id,
          },
        })
        updated++
      } catch (e: any) {
        errors.push(`${r.shipment.trackingNumber}: ${e?.message || 'failed'}`)
      }
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'BULK_UPDATE',
        entity: 'Return',
        entityId: action,
        afterData: JSON.stringify({ requested: ids.length, updated, skipped, errors: errors.length }),
      },
    })

    return NextResponse.json({
      ok: true,
      action,
      requested: ids.length,
      updated,
      skipped,
      notFound: ids.length - items.length,
      errors,
    })
  } catch (e: any) {
    console.error('Returns bulk error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
