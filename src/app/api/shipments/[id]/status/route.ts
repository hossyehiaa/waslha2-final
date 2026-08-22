import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { sendShipmentNotification } from '@/lib/notification-service'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import type { WebhookEvent } from '@/lib/partner-api'
import { updateShipmentStatus } from '@/lib/partner-api'
import { syncShopifyShipmentStatus } from '@/lib/shopify'

export const runtime = 'nodejs'

// Valid status transitions (business logic from Flash Express)
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'RETURNED', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'RETURNED', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNED', 'IN_TRANSIT'],
  DELIVERED: [], // terminal
  RETURNED: ['IN_TRANSIT'], // can be re-shipped
  CANCELLED: [], // terminal
  FAILED: ['OUT_FOR_DELIVERY', 'RETURNED'], // can retry or return
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { status, note, driverId, failureReason } = body

    const VALID_STATUSES = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED', 'FAILED']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (shipment.status === status) return NextResponse.json({ error: 'Shipment already has this status' }, { status: 409 })

    // Permission check: only operations staff and the assigned driver can change lifecycle state.
    if (user.role === 'CLIENT') {
      if (!user.clientId || shipment.clientId !== user.clientId || status !== 'CANCELLED' || shipment.status !== 'PENDING') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (user.role === 'DRIVER') {
      if (!user.driverId || shipment.driverId !== user.driverId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { shipment: updated } = await updateShipmentStatus({
      shipmentId: id,
      status,
      note: note || `Status updated by ${user.fullName}`,
      location: body.location || null,
      changedBy: user.id,
      driverId,
      failureReason,
    })

    // If delivered with COD, update client balances
    if (status === 'DELIVERED' && shipment.codAmount > 0) {
      await db.client.update({
        where: { id: shipment.clientId },
        data: {
          codCollected: { increment: shipment.codAmount },
          codPending: { increment: shipment.codAmount },
        },
      })
    }

    // If returned, decrement active shipments
    if (status === 'DELIVERED' || status === 'RETURNED' || status === 'CANCELLED') {
      await db.client.update({
        where: { id: shipment.clientId },
        data: { activeShipments: { decrement: 1 } },
      })
    }

    // If delivered, update driver stats
    if (status === 'DELIVERED' && shipment.driverId) {
      const codFee = shipment.codFee || 0
      const driverShare = codFee * 0.5 // driver gets 50% of COD fee
      await db.driver.update({
        where: { id: shipment.driverId },
        data: {
          totalDeliveries: { increment: 1 },
          totalEarnings: { increment: driverShare },
          pendingEarnings: { increment: driverShare },
        },
      })
    }

    // Create notification for client
    const statusMessages: Record<string, string> = {
      PICKED_UP: `Shipment ${shipment.trackingNumber} has been picked up`,
      IN_TRANSIT: `Shipment ${shipment.trackingNumber} is in transit`,
      OUT_FOR_DELIVERY: `Shipment ${shipment.trackingNumber} is out for delivery`,
      DELIVERED: `Shipment ${shipment.trackingNumber} has been delivered successfully`,
      RETURNED: `Shipment ${shipment.trackingNumber} has been returned`,
      CANCELLED: `Shipment ${shipment.trackingNumber} has been cancelled`,
      FAILED: `Shipment ${shipment.trackingNumber} delivery failed${failureReason ? `: ${failureReason}` : ''}`,
    }

    if (shipment.client?.userId && statusMessages[status]) {
      await db.notification.create({
        data: {
          userId: shipment.client.userId,
          type: 'SHIPMENT',
          title: `Shipment ${status.replace(/_/g, ' ')}`,
          message: statusMessages[status],
          isRead: false,
          link: `/dashboard/shipments/${id}`,
        },
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Shipment',
        entityId: id,
        afterData: JSON.stringify({ status, note }),
      },
    })

    // Send Email/SMS/WhatsApp notifications
    if (statusMessages[status]) {
      const notificationType = `SHIPMENT_${status}`
      try {
        await sendShipmentNotification(notificationType, shipment, shipment.client)
      } catch (e) {
        console.error('Notification send error:', e)
      }
    }

    const webhookData = {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status,
      previousStatus: shipment.status,
      codAmount: shipment.codAmount,
      updatedAt: updated.updatedAt.toISOString(),
    }
    if (status !== shipment.status) {
      void dispatchWebhookEvent(shipment.clientId, 'shipment.status_changed', webhookData).catch((error) => console.error('Shipment status webhook error:', error))
      const webhookEvent = `shipment.${status.toLowerCase()}` as WebhookEvent
      if (webhookEvent !== 'shipment.status_changed') void dispatchWebhookEvent(shipment.clientId, webhookEvent, webhookData).catch((error) => console.error('Shipment status webhook error:', error))
      void syncShopifyShipmentStatus(id, status).catch(async () => {
        await db.shopifyInstallation.updateMany({ where: { clientId: shipment.clientId }, data: { lastError: 'Shopify fulfillment sync failed' } }).catch(() => undefined)
      })
    }

    // Award loyalty points on delivery
    if (status === 'DELIVERED') {
      try {
        const pointsEarned = Math.floor(shipment.codAmount / 100) // 1 point per 100 EGP COD
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
      } catch (e) {
        console.error('Loyalty points error:', e)
      }
    }

    return NextResponse.json({ shipment: updated })
  } catch (e: any) {
    console.error('Status update error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
