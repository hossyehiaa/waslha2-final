import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { forceShipmentStatus, BULK_ALLOWED_STATUSES, BulkStatus } from '@/lib/shipment-status'

export const runtime = 'nodejs'

const MAX_BULK = 500

/**
 * PATCH /api/shipments/bulk
 * Body: { ids: string[], status: string, note?: string }
 * Applies a single lifecycle status to many shipments (admin/employee only).
 * Any status can be forced (customizable), each change is recorded in history.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : []
    const status = String(body.status || '')
    const note = body.note ? String(body.note) : null

    if (ids.length === 0) return NextResponse.json({ error: 'No shipments selected' }, { status: 400 })
    if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot update more than ${MAX_BULK} shipments at once` }, { status: 400 })
    if (!BULK_ALLOWED_STATUSES.includes(status as BulkStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const shipments = await db.shipment.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        trackingNumber: true,
        clientId: true,
        status: true,
        paymentStatus: true,
        codAmount: true,
        codFee: true,
        driverId: true,
        pickupAt: true,
        client: { select: { userId: true } },
      },
    })

    let updated = 0
    let skipped = 0
    const errors: { id: string; trackingNumber: string; error: string }[] = []

    for (const shipment of shipments) {
      if (shipment.status === status) {
        skipped++
        continue
      }
      const result = await forceShipmentStatus({
        shipment,
        status: status as BulkStatus,
        note: note || undefined,
        changedBy: user.id,
        // bound webhook/HTTP work on very large batches
        withWebhooks: shipments.length <= 100,
      })
      if (result.ok) updated++
      else errors.push({ id: shipment.id, trackingNumber: shipment.trackingNumber, error: result.error })
    }

    const notFound = ids.length - shipments.length

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'BULK_UPDATE',
        entity: 'Shipment',
        entityId: 'bulk',
        afterData: JSON.stringify({ status, note, requested: ids.length, updated, skipped, notFound, errors: errors.length }),
      },
    })

    return NextResponse.json({
      ok: true,
      status,
      requested: ids.length,
      updated,
      skipped,
      notFound,
      errors,
    })
  } catch (e: any) {
    console.error('Bulk status update error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
