import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

/**
 * ONE-TIME LAUNCH RESET — wipes all test data before going live.
 *
 * DELETED (all test transactions):
 *   shipments, statuses, returns, insurance claims, invoices, payments,
 *   COD settlements, payouts, expenses, cash orders, transfers, pickups,
 *   flyer requests, notifications, activity/audit/api logs, webhook deliveries,
 *   shopify orders/events, idempotency keys, sessions, loyalty points,
 *   bulk imports, notification logs — and every CLIENT account that is not protected.
 *
 * KEPT (setup + real accounts):
 *   - protected client(s): opalithcairo (real client) + user + API keys/webhooks/addresses
 *   - ADMIN / EMPLOYEE / DRIVER users (operations staff)
 *   - cities, zones, branches, warehouses, drivers, employees
 *   - pricing rules, system settings, permission templates, cancel reasons,
 *     expense types, loyalty tiers, financial accounts (balances zeroed)
 *
 * Counters on kept clients are zeroed and the tracking sequence restarts at WS1.
 *
 * This endpoint is removed from the codebase after the launch reset is executed.
 */

const CONFIRM_PHRASE = 'LAUNCH-RESET'
const PROTECTED_CLIENT_USERNAMES = ['opalithcairo']

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: any = null
    try { body = await req.json() } catch {}
    if (body?.confirm !== CONFIRM_PHRASE) {
      return NextResponse.json({ error: 'Missing confirm phrase' }, { status: 400 })
    }

    const before = {
      shipments: await db.shipment.count(),
      invoices: await db.invoice.count(),
      clients: await db.client.count(),
      users: await db.user.count(),
    }

    // 1) Shipment-dependent records (FK restrict) — delete BEFORE shipments
    await db.insuranceClaim.deleteMany({})
    await db.return.deleteMany({})
    await db.codSettlement.deleteMany({})
    await db.shipmentStatus.deleteMany({})
    await db.shippingLabel.deleteMany({})

    // 2) All shipments (test data)
    await db.shipment.deleteMany({})

    // 3) Finance / transactional records
    await db.invoice.deleteMany({})
    await db.clientPayment.deleteMany({})
    await db.payoutRequest.deleteMany({})
    await db.expense.deleteMany({})
    await db.flyerRequest.deleteMany({})
    await db.pickupRequest.deleteMany({})
    await db.cashOrder.deleteMany({})
    await db.accountTransfer.deleteMany({})
    await db.branchTransfer.deleteMany({})

    // 4) Logs / transient data
    await db.notification.deleteMany({})
    await db.activityLog.deleteMany({})
    await db.auditLog.deleteMany({})
    await db.apiRequestLog.deleteMany({})
    await db.webhookDelivery.deleteMany({})
    await db.shopifyOrder.deleteMany({})
    await db.shopifyWebhookEvent.deleteMany({})
    await db.shopifyOAuthState.deleteMany({})
    await db.idempotencyKey.deleteMany({})
    await db.loyaltyPoint.deleteMany({})
    await db.bulkImport.deleteMany({})
    await db.notificationLog.deleteMany({})

    // 5) Sessions — forces clean re-login for the live launch
    await db.session.deleteMany({})

    // 6) Delete every CLIENT account that is NOT protected (test merchants)
    const protectedUsers = await db.user.findMany({
      where: { username: { in: PROTECTED_CLIENT_USERNAMES } },
      select: { id: true, username: true },
    })
    const protectedIds = protectedUsers.map((u) => u.id)
    const deletedClientUsers = await db.user.deleteMany({
      where: { role: 'CLIENT', id: { notIn: protectedIds } },
    })

    // 7) Zero the counters of the kept client(s)
    const resetClients = await db.client.updateMany({
      data: {
        codBalance: 0,
        codCollected: 0,
        codPaid: 0,
        codPending: 0,
        shippingBalance: 0,
        totalShipments: 0,
        activeShipments: 0,
        rating: 5,
      },
    })

    // 8) Zero financial account balances (keep the accounts themselves)
    const resetAccounts = await db.account.updateMany({ data: { balance: 0 } })

    // 9) Restart tracking sequence → next shipment will be WS1
    await db.$executeRaw`ALTER SEQUENCE shipment_tracking_seq RESTART WITH 1`

    // 10) Fresh audit entry documenting the official launch reset
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LAUNCH_RESET',
        entity: 'System',
        entityId: 'launch-reset',
        afterData: JSON.stringify({
          at: new Date().toISOString(),
          deletedClientUsers: deletedClientUsers.count,
          protectedClientUsernames: PROTECTED_CLIENT_USERNAMES,
        }),
      },
    })

    const after = {
      shipments: await db.shipment.count(),
      invoices: await db.invoice.count(),
      returns: await db.return.count(),
      payments: await db.clientPayment.count(),
      expenses: await db.expense.count(),
      clients: await db.client.count(),
      clientUsers: await db.user.count({ where: { role: 'CLIENT' } }),
      users: await db.user.count(),
      protectedClients: await db.client.findMany({
        where: { user: { username: { in: PROTECTED_CLIENT_USERNAMES } } },
        select: { companyName: true, status: true },
      }),
    }

    return NextResponse.json({
      success: true,
      message: 'Launch reset complete — system is clean and ready for live operations',
      before,
      after,
      deleted: { clientUsers: deletedClientUsers.count, resetClients: resetClients.count, resetAccounts: resetAccounts.count },
      tracking: 'next shipment will be WS1',
    })
  } catch (e: any) {
    console.error('[launch-reset]', e)
    return NextResponse.json({ error: 'Server error', detail: e?.message }, { status: 500 })
  }
}
