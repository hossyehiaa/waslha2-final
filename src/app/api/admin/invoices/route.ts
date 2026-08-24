import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET /api/admin/invoices
// Optional: ?clientId=... (per-customer view) — also returns a per-client summary
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    const where: any = {}
    if (clientId && clientId !== 'all') where.clientId = clientId

    const [invoices, clientsRaw] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: { select: { id: true, companyName: true } },
          shipments: { select: { id: true }, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.invoice.groupBy({
        by: ['clientId'],
        _sum: { total: true },
        _count: { _all: true },
        where: { status: { in: ['UNPAID', 'OVERDUE', 'PENDING_PAYMENT'] } },
      }),
    ])

    const allClients = await db.client.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: 'asc' },
    })

    const unpaidByClient = new Map(clientsRaw.map((g) => [g.clientId, { total: g._sum.total || 0, count: g._count._all }]))
    const clients = allClients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      unpaidTotal: unpaidByClient.get(c.id)?.total || 0,
      unpaidCount: unpaidByClient.get(c.id)?.count || 0,
    }))

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        clientId: i.client.id,
        client: i.client.companyName,
        type: i.type,
        amount: i.amount,
        tax: i.tax,
        total: i.total,
        status: i.status,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        paymentId: i.paymentId,
        shipmentCount: i.shipments.length,
        createdAt: i.createdAt,
      })),
      clients,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/invoices — create a new invoice from a set of client orders.
// Body: { clientId, shipmentIds: string[], note? }
// The invoice amount/total is the sum of shippingCost + codFee of those shipments.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const clientId = String(body.clientId || '')
    const shipmentIds: string[] = Array.isArray(body.shipmentIds) ? body.shipmentIds.map(String) : []

    if (!clientId) return NextResponse.json({ error: 'العميل مطلوب' }, { status: 400 })
    if (shipmentIds.length === 0) return NextResponse.json({ error: 'اختر شحنة واحدة على الأقل' }, { status: 400 })

    const shipments = await db.shipment.findMany({
      where: { id: { in: shipmentIds }, clientId },
      select: { id: true, shippingCost: true, codFee: true, invoiceId: true },
    })

    if (shipments.length === 0) return NextResponse.json({ error: 'لا توجد شحنات صالحة' }, { status: 400 })

    const alreadyLinked = shipments.filter((s) => s.invoiceId).length
    if (alreadyLinked > 0) {
      return NextResponse.json({ error: `${alreadyLinked} من الشحنات مضافة لفاتورة أخرى — أزِلها أولاً` }, { status: 400 })
    }

    const amount = shipments.reduce((s, x) => s + (x.shippingCost || 0) + (x.codFee || 0), 0)
    const reference = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const invoice = await db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: reference,
          clientId,
          type: 'SHIPPING',
          amount,
          tax: 0,
          total: amount,
          status: 'UNPAID',
        },
      })
      await tx.shipment.updateMany({
        where: { id: { in: shipments.map((s) => s.id) } },
        data: { invoiceId: created.id },
      })
      return created
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: invoice.id,
        afterData: JSON.stringify({ reference, clientId, shipments: shipments.length, amount }),
      },
    })

    return NextResponse.json({ ok: true, id: invoice.id, invoiceNumber: reference, amount, shipmentCount: shipments.length }, { status: 201 })
  } catch (e: any) {
    console.error('Invoice create error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/admin/invoices — bulk invoice actions
// Body: { ids: string[], action: 'send_to_payment' | 'unsend' | 'mark_paid', method?, note?, proofUrl? }
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : []
    const action = String(body.action || '')

    if (ids.length === 0) return NextResponse.json({ error: 'لم يتم تحديد فواتير' }, { status: 400 })

    // 1) Mark invoices as awaiting payment (sent from the per-customer view)
    if (action === 'send_to_payment') {
      const res = await db.invoice.updateMany({
        where: { id: { in: ids }, status: { in: ['UNPAID', 'OVERDUE'] } },
        data: { status: 'PENDING_PAYMENT' },
      })
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'BULK_UPDATE',
          entity: 'Invoice',
          entityId: 'send_to_payment',
          afterData: JSON.stringify({ requested: ids.length, updated: res.count }),
        },
      })
      return NextResponse.json({ ok: true, updated: res.count, skipped: ids.length - res.count })
    }

    // 2) Undo "sent to payment"
    if (action === 'unsend') {
      const res = await db.invoice.updateMany({
        where: { id: { in: ids }, status: 'PENDING_PAYMENT' },
        data: { status: 'UNPAID' },
      })
      return NextResponse.json({ ok: true, updated: res.count, skipped: ids.length - res.count })
    }

    // 3) Mark as PAID — creates a ClientPayment record (with optional screenshot proof)
    if (action === 'mark_paid') {
      const method = ['BANK_TRANSFER', 'CASH', 'WALLET', 'OTHER'].includes(body.method) ? body.method : 'BANK_TRANSFER'
      const note = body.note ? String(body.note).slice(0, 500) : null
      let proofUrl: string | null = null
      if (typeof body.proofUrl === 'string' && body.proofUrl.startsWith('data:image/')) {
        if (body.proofUrl.length > 3_000_000) {
          return NextResponse.json({ error: 'حجم الصورة كبير جداً (الحد 2 ميجابايت تقريباً)' }, { status: 400 })
        }
        proofUrl = body.proofUrl
      }

      const invoices = await db.invoice.findMany({
        where: { id: { in: ids }, status: { in: ['UNPAID', 'OVERDUE', 'PENDING_PAYMENT'] } },
        include: { client: { select: { id: true, companyName: true } } },
      })
      if (invoices.length === 0) return NextResponse.json({ error: 'لا توجد فواتير صالحة للسداد' }, { status: 400 })

      // All invoices in one payment must belong to the same client
      const clientIds = new Set(invoices.map((i) => i.clientId))
      if (clientIds.size > 1) {
        return NextResponse.json({ error: 'يجب أن تكون الفواتير المحددة لنفس العميل' }, { status: 400 })
      }

      const amount = invoices.reduce((s, i) => s + i.total, 0)
      const reference = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const invoiceIds = invoices.map((i) => i.id)
      const now = new Date()

      const payment = await db.$transaction(async (tx) => {
        const created = await tx.clientPayment.create({
          data: {
            reference,
            clientId: invoices[0].clientId,
            amount,
            method,
            note,
            proofUrl,
            invoiceCount: invoices.length,
            invoiceIds: JSON.stringify(invoiceIds),
            createdById: user.id,
          },
        })
        await tx.invoice.updateMany({
          where: { id: { in: invoiceIds } },
          data: { status: 'PAID', paidAt: now, paymentId: created.id },
        })
        return created
      })

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entity: 'ClientPayment',
          entityId: payment.id,
          afterData: JSON.stringify({ reference, amount, invoices: invoices.length, method }),
        },
      })

      return NextResponse.json({ ok: true, updated: invoices.length, payment: { id: payment.id, reference, amount } })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (e: any) {
    console.error('Invoices bulk error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
