import { db } from '@/lib/db'

/**
 * Automatic returns pipeline.
 *
 * Business rule (per operations request):
 * - A shipment whose delivery FAILED (customer refused to receive it) immediately
 *   becomes a return and shows up in Returns Management (status PENDING = the
 *   package is still with the driver, waiting to be received back).
 * - A shipment that gets CANCELLED while already in flight (picked up / in transit /
 *   out for delivery) also becomes a return immediately.
 *   Cancelling a shipment that was never picked up does NOT create a return —
 *   there is no physical package to bring back.
 * - Marking a shipment RETURNED directly completes its return record
 *   (or creates a completed one) so returns history stays complete.
 * - When a failed shipment is retried and finally DELIVERED (or goes back
 *   OUT_FOR_DELIVERY), its open return record is removed automatically.
 */

export const OPEN_RETURN_STATUSES = ['PENDING', 'IN_TRANSIT']

/** Was the shipment physically out with a driver/branch when it was cancelled? */
export function shipmentWasInFlight(shipment: {
  pickupAt?: Date | null
  status?: string | null
}): boolean {
  const inFlightStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED']
  if (shipment.pickupAt) return true
  return inFlightStatuses.includes(String(shipment.status || ''))
}

export type AutoReturnOutcome = 'created' | 'completed' | 'exists' | 'skipped'

/**
 * Idempotently make sure a Return record exists for a shipment.
 * - No return yet            -> create with `status` (default PENDING)
 * - Open return + terminal   -> complete it (status RETURNED_TO_CLIENT)
 * - Existing same status     -> nothing to do
 */
export async function ensureReturnForShipment(opts: {
  shipmentId: string
  reason: string
  status?: string // PENDING | RETURNED_TO_CLIENT
  changedBy?: string | null
  note?: string | null
}): Promise<AutoReturnOutcome> {
  const { shipmentId, reason } = opts
  const status = opts.status || 'PENDING'
  const changedBy = opts.changedBy || null

  const existing = await db.return.findUnique({ where: { shipmentId } })
  if (existing) {
    const isOpen = OPEN_RETURN_STATUSES.includes(existing.status)
    if (status === 'RETURNED_TO_CLIENT' && isOpen) {
      await db.return.update({
        where: { id: existing.id },
        data: {
          status: 'RETURNED_TO_CLIENT',
          reason: reason || existing.reason,
        },
      })
      await db.shipmentStatus.create({
        data: {
          shipmentId,
          status: 'RETURNED_TO_CLIENT',
          note: opts.note || 'Return record completed (shipment marked RETURNED)',
          createdBy: changedBy,
        },
      })
      return 'completed'
    }
    return 'exists'
  }

  try {
    await db.return.create({
      data: {
        shipmentId,
        reason: String(reason).slice(0, 500),
        status,
      },
    })
    await db.shipmentStatus.create({
      data: {
        shipmentId,
        status: 'RETURN_OPENED',
        note: opts.note || `Return record auto-created (${status})`,
        createdBy: changedBy,
      },
    })
    return 'created'
  } catch {
    // Unique race (concurrent request already created it) — treat as exists
    return 'exists'
  }
}

/** Remove open return records (retry succeeded / shipment re-dispatched). */
export async function voidOpenReturn(shipmentId: string): Promise<boolean> {
  const existing = await db.return.findUnique({ where: { shipmentId } })
  if (!existing || !OPEN_RETURN_STATUSES.includes(existing.status)) return false
  await db.return.delete({ where: { id: existing.id } })
  await db.shipmentStatus.create({
    data: {
      shipmentId,
      status: 'RETURN_VOIDED',
      note: 'Open return removed — shipment delivered / re-dispatched',
      createdBy: null,
    },
  })
  return true
}

/**
 * Central hook invoked after any shipment lifecycle status change.
 * Keeps the Return table in sync automatically.
 */
export async function syncReturnForStatusChange(opts: {
  shipmentId: string
  newStatus: string
  previousStatus: string
  pickupAt?: Date | null
  failureReason?: string | null
  note?: string | null
  changedBy?: string | null
}): Promise<AutoReturnOutcome | 'voided' | 'none'> {
  const { shipmentId, newStatus, previousStatus } = opts

  try {
    if (newStatus === 'FAILED') {
      // Customer refused / delivery failed — the package must come back.
      const reason = opts.failureReason
        ? `فشل التسليم: ${opts.failureReason}`
        : 'فشل التسليم — العميل رفض الاستلام'
      return await ensureReturnForShipment({
        shipmentId,
        reason,
        status: 'PENDING',
        changedBy: opts.changedBy,
        note: opts.note || 'Auto-return: delivery failed (customer refused)',
      })
    }

    if (newStatus === 'CANCELLED') {
      // Only in-flight cancellations produce a physical return.
      const inFlight = opts.pickupAt ? true : shipmentWasInFlight({ status: previousStatus })
      if (!inFlight) return 'none'
      return await ensureReturnForShipment({
        shipmentId,
        reason: opts.failureReason
          ? `إلغاء الشحنة: ${opts.failureReason}`
          : 'تم إلغاء الشحنة — بانتظار الاستلام من المنديب',
        status: 'PENDING',
        changedBy: opts.changedBy,
        note: 'Auto-return: in-flight shipment cancelled',
      })
    }

    if (newStatus === 'RETURNED') {
      return await ensureReturnForShipment({
        shipmentId,
        reason: 'تم إرجاع الشحنة للعميل',
        status: 'RETURNED_TO_CLIENT',
        changedBy: opts.changedBy,
        note: 'Auto-return: shipment marked RETURNED',
      })
    }

    if (newStatus === 'DELIVERED' || newStatus === 'OUT_FOR_DELIVERY') {
      const voided = await voidOpenReturn(shipmentId)
      return voided ? 'voided' : 'none'
    }

    return 'none'
  } catch (e) {
    console.error('syncReturnForStatusChange error:', e)
    return 'none'
  }
}
