import { db } from '@/lib/db'

/**
 * Automatic returns pipeline.
 *
 * Business rule (per operations request — updated flow):
 * - EVERY shipment that becomes FAILED (customer refused), CANCELLED or
 *   RETURNED immediately opens a Return record with status PENDING —
 *   i.e. it shows up in «استلام المرتجعات» waiting to be received back
 *   from the driver. It does NOT appear in Returns Management yet.
 * - Lifecycle: استلام المرتجعات (PENDING) → تسليم المرتجعات (IN_TRANSIT)
 *   → إدارة المرتجعات (RETURNED_TO_CLIENT = archived / delivered to client).
 * - When a failed shipment is retried and finally DELIVERED (or goes back
 *   to any active delivery status), its open return record is removed.
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
      // Opens at PENDING → shows in «استلام المرتجعات».
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
      // Every cancelled shipment opens a return at PENDING so it flows through
      // استلام المرتجعات → تسليم المرتجعات → إدارة المرتجعات.
      const inFlight = opts.pickupAt ? true : shipmentWasInFlight({ status: previousStatus })
      return await ensureReturnForShipment({
        shipmentId,
        reason: opts.failureReason
          ? `إلغاء الشحنة: ${opts.failureReason}`
          : inFlight
            ? 'تم إلغاء الشحنة — بانتظار الاستلام من المنديب'
            : 'تم إلغاء الشحنة قبل الاستلام — بانتظار الاستلام من المنديب',
        status: 'PENDING',
        changedBy: opts.changedBy,
        note: 'Auto-return: shipment cancelled',
      })
    }

    if (newStatus === 'RETURNED') {
      // Marking a shipment RETURNED (مرتجع) does NOT complete the return —
      // it only opens/keeps it at PENDING so the admin receives it from the
      // driver (استلام المرتجعات) then delivers it back (تسليم المرتجعات).
      // Completion (RETURNED_TO_CLIENT) happens exclusively via the
      // «تسليم المرتجعات» action, after which it is archived in
      // «إدارة المرتجعات».
      const existing = await db.return.findUnique({ where: { shipmentId } })
      if (existing && !OPEN_RETURN_STATUSES.includes(existing.status)) {
        // Already completed/archived — leave as is.
        return 'exists'
      }
      return await ensureReturnForShipment({
        shipmentId,
        reason: 'تم تحويل الشحنة لمرتجع — بانتظار الاستلام من المنديب',
        status: 'PENDING',
        changedBy: opts.changedBy,
        note: 'Auto-return: shipment marked RETURNED — awaiting receipt from driver',
      })
    }

    // Any active delivery status voids an open return (re-dispatch / success).
    const ACTIVE_DELIVERY_STATUSES = ['DELIVERED', 'OUT_FOR_DELIVERY', 'PICKED_UP', 'IN_TRANSIT', 'PENDING']
    if (ACTIVE_DELIVERY_STATUSES.includes(newStatus)) {
      const voided = await voidOpenReturn(shipmentId)
      return voided ? 'voided' : 'none'
    }

    return 'none'
  } catch (e) {
    console.error('syncReturnForStatusChange error:', e)
    return 'none'
  }
}
