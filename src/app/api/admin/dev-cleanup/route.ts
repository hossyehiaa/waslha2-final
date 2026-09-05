import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

/**
 * ONE-TIME cleanup: deletes the single verification test shipment WS4
 * (created by the admin during the print/edit/governorate deploy check).
 * Real live orders WS1 / WS2 / WS3 are NEVER touched. The tracking sequence
 * is reset to 4 so the next live order takes WS4 with no gap.
 * This endpoint is removed from the codebase right after execution.
 */
const TEST_TRACKING = 'WS4'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shipment = await db.shipment.findUnique({ where: { trackingNumber: TEST_TRACKING } })
    if (!shipment) {
      return NextResponse.json({ success: true, message: 'Nothing to clean' })
    }

    await db.insuranceClaim.deleteMany({ where: { shipmentId: shipment.id } })
    await db.return.deleteMany({ where: { shipmentId: shipment.id } })
    await db.shipmentStatus.deleteMany({ where: { shipmentId: shipment.id } })
    await db.shippingLabel.deleteMany({ where: { shipmentId: shipment.id } })
    await db.shipment.delete({ where: { id: shipment.id } })

    // next live order continues at WS4 (real orders are WS1..WS3)
    await db.$executeRaw`ALTER SEQUENCE shipment_tracking_seq RESTART WITH 4`

    const remaining = await db.shipment.findMany({
      orderBy: { trackingNumber: 'asc' },
      select: { trackingNumber: true, status: true },
    })

    return NextResponse.json({
      success: true,
      deleted: TEST_TRACKING,
      remainingShipments: remaining,
    })
  } catch (e: any) {
    console.error('[dev-cleanup]', e)
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 })
  }
}
