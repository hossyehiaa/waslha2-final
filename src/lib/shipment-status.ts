import { db } from '@/lib/db'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import { syncShopifyShipmentStatus } from '@/lib/shopify'
import { sendShipmentNotification } from '@/lib/notification-service'
import type { WebhookEvent } from '@/lib/partner-api'

/**
 * Shared, transition-unrestricted status change core used by bulk operations.
 * Admins may force any lifecycle status on any shipment; every change is
 * recorded in ShipmentStatus history with the acting user.
 */

export const BULK_ALLOWED_STATUSES = [
  'PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
  'FAILED',
] as const

export type BulkStatus = (typeof BULK_ALLOWED_STATUSES)[number]

type ShipmentWithClient = {
  id: string
  trackingNumber: string
  clientId: string
  status: string
  paymentStatus: string
  codAmount: number
  codFee: number
  driverId: string | null
  pickupAt: Date | null
  client: { userId: string } | null
}

export async function forceShipmentStatus(opts: {
  shipment: ShipmentWithClient
  status: BulkStatus
  note?: string | null
  changedBy: string
  failureReason?: string | null
  withWebhooks?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { shipment, status, changedBy, withWebhooks = true } = opts
  const note = opts.note || `Bulk status change to ${status} by staff`
  const failureReason = opts.failureReason || null

  const now = new Date()
  const updateData: Record<string, unknown> = { status }
  if (status === 'PICKED_UP' && !shipment.pickupAt) updateData.pickupAt = now
  if (status === 'DELIVERED') {
    updateData.deliveredAt = now
    if (shipment.codAmount > 0 && shipment.paymentStatus === 'PENDING') {
      updateData.paymentStatus = 'COLLECTED'
      updateData.codCollectedAt = now
    }
  }

  try {
    // Optimistic claim so concurrent updates don't double-apply
    const claimed = await db.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status },
      data: updateData,
    })
    if (claimed.count !== 1) return { ok: false, error: 'conflict' }

    await db.shipmentStatus.create({
      data: {
        shipmentId: shipment.id,
        status,
        note,
        createdBy: changedBy,
      },
    })

    // Client COD balances when delivered
    if (status === 'DELIVERED' && shipment.codAmount > 0) {
      await db.client
        .update({
          where: { id: shipment.clientId },
          data: {
            codCollected: { increment: shipment.codAmount },
            codPending: { increment: shipment.codAmount },
          },
        })
        .catch(() => undefined)
    }

    // Active shipments counter
    if (status === 'DELIVERED' || status === 'RETURNED' || status === 'CANCELLED') {
      if (shipment.status !== 'DELIVERED' && shipment.status !== 'RETURNED' && shipment.status !== 'CANCELLED') {
        await db.client
          .update({
            where: { id: shipment.clientId },
            data: { activeShipments: { decrement: 1 } },
          })
          .catch(() => undefined)
      }
    }

    // Driver stats on delivery
    if (status === 'DELIVERED' && shipment.driverId) {
      const driverShare = (shipment.codFee || 0) * 0.5
      await db.driver
        .update({
          where: { id: shipment.driverId },
          data: {
            totalDeliveries: { increment: 1 },
            totalEarnings: { increment: driverShare },
            pendingEarnings: { increment: driverShare },
          },
        })
        .catch(() => undefined)
    }

    // In-app notification for the client
    if (shipment.client?.userId) {
      await db.notification
        .create({
          data: {
            userId: shipment.client.userId,
            type: 'SHIPMENT',
            title: `Shipment ${status.replace(/_/g, ' ')}`,
            message: `Shipment ${shipment.trackingNumber} status changed to ${status.replace(/_/g, ' ').toLowerCase()}`,
            isRead: false,
            link: `/dashboard/shipments/${shipment.id}`,
          },
        })
        .catch(() => undefined)
    }

    // Loyalty points on delivery
    if (status === 'DELIVERED') {
      try {
        const pointsEarned = Math.floor(shipment.codAmount / 100)
        if (pointsEarned > 0) {
          await db.loyaltyPoint.create({
            data: {
              clientId: shipment.clientId,
              points: pointsEarned,
              reason: `Shipment ${shipment.trackingNumber} delivered - ${pointsEarned} points earned`,
              shipmentId: shipment.id,
            },
          })
        }
      } catch {
        // loyalty is best-effort
      }
    }

    // Webhooks + Shopify sync (best-effort, bounded)
    if (withWebhooks && status !== shipment.status) {
      try {
        const webhookData = {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status,
          previousStatus: shipment.status,
          codAmount: shipment.codAmount,
          updatedAt: now.toISOString(),
        }
        await dispatchWebhookEvent(shipment.clientId, 'shipment.status_changed', webhookData)
        const specific = `shipment.${status.toLowerCase()}` as WebhookEvent
        if (specific !== 'shipment.status_changed') {
          await dispatchWebhookEvent(shipment.clientId, specific, webhookData)
        }
      } catch {
        // webhook failures must not break bulk flow
      }
      void syncShopifyShipmentStatus(shipment.id, status).catch(() => undefined)
    }

    return { ok: true }
  } catch (e) {
    console.error('forceShipmentStatus error:', e)
    return { ok: false, error: 'server error' }
  }
}

export async function sendBulkShipmentNotifications(
  shipment: ShipmentWithClient,
  status: BulkStatus
) {
  const statusMessages: Record<string, string> = {
    PICKED_UP: `Shipment ${shipment.trackingNumber} has been picked up`,
    IN_TRANSIT: `Shipment ${shipment.trackingNumber} is in transit`,
    OUT_FOR_DELIVERY: `Shipment ${shipment.trackingNumber} is out for delivery`,
    DELIVERED: `Shipment ${shipment.trackingNumber} has been delivered successfully`,
    RETURNED: `Shipment ${shipment.trackingNumber} has been returned`,
    CANCELLED: `Shipment ${shipment.trackingNumber} has been cancelled`,
    FAILED: `Shipment ${shipment.trackingNumber} delivery failed`,
  }
  if (!statusMessages[status]) return
  try {
    await sendShipmentNotification(`SHIPMENT_${status}`, shipment as any, shipment.client as any)
  } catch {
    // external notifications are best-effort
  }
}
