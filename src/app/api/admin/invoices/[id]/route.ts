import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET /api/admin/invoices/[id] — full invoice with its shipments list
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        shipments: {
          select: {
            id: true,
            trackingNumber: true,
            codAmount: true,
            shippingCost: true,
            codFee: true,
            totalCost: true,
            status: true,
            createdAt: true,
            senderCity: { select: { name: true } },
            recipientCity: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.client.id,
        client: invoice.client.companyName,
        type: invoice.type,
        amount: invoice.amount,
        tax: invoice.tax,
        total: invoice.total,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        shipments: invoice.shipments.map((s) => ({
          id: s.id,
          trackingNumber: s.trackingNumber,
          route: `${s.senderCity?.name || '-'} → ${s.recipientCity?.name || '-'}`,
          codAmount: s.codAmount,
          shippingCost: s.shippingCost,
          codFee: s.codFee,
          totalCost: s.totalCost,
          status: s.status,
          createdAt: s.createdAt,
        })),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/admin/invoices/[id] — add/remove shipments in an invoice + recompute totals
// Body: { addShipmentIds?: string[], removeShipmentIds?: string[] }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const invoice = await db.invoice.findUnique({ where: { id } })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const addIds: string[] = Array.isArray(body.addShipmentIds) ? body.addShipmentIds.map(String) : []
    const removeIds: string[] = Array.isArray(body.removeShipmentIds) ? body.removeShipmentIds.map(String) : []

    if (addIds.length === 0 && removeIds.length === 0) {
      return NextResponse.json({ error: 'لا توجد تغييرات' }, { status: 400 })
    }

    // Validate that added shipments belong to the same client and aren't already linked elsewhere
    if (addIds.length > 0) {
      const candidates = await db.shipment.findMany({
        where: { id: { in: addIds }, clientId: invoice.clientId },
        select: { id: true, invoiceId: true },
      })
      const blocked = candidates.filter((s) => s.invoiceId && s.invoiceId !== id)
      if (blocked.length > 0) {
        return NextResponse.json({ error: `${blocked.length} من الشحنات مضافة لفاتورة أخرى` }, { status: 400 })
      }
      const notFound = addIds.length - candidates.length
      if (notFound > 0) {
        return NextResponse.json({ error: `${notFound} من الشحنات لا تنتمي لهذا العميل` }, { status: 400 })
      }
    }

    await db.$transaction(async (tx) => {
      // Unlink removed shipments first
      if (removeIds.length > 0) {
        await tx.shipment.updateMany({
          where: { id: { in: removeIds }, invoiceId: id },
          data: { invoiceId: null },
        })
      }
      // Link added shipments
      if (addIds.length > 0) {
        await tx.shipment.updateMany({
          where: { id: { in: addIds }, invoiceId: null, clientId: invoice.clientId },
          data: { invoiceId: id },
        })
      }
      // Recompute totals from current set
      const current = await tx.shipment.findMany({
        where: { invoiceId: id },
        select: { shippingCost: true, codFee: true },
      })
      const amount = current.reduce((s, x) => s + (x.shippingCost || 0) + (x.codFee || 0), 0)
      await tx.invoice.update({ where: { id }, data: { amount, total: amount } })
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: id,
        afterData: JSON.stringify({ added: addIds.length, removed: removeIds.length }),
      },
    })

    return NextResponse.json({ ok: true, added: addIds.length, removed: removeIds.length })
  } catch (e: any) {
    console.error('Invoice edit shipments error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/admin/invoices/[id] — remove an UNPAID invoice (also unlinks its shipments)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params

    const invoice = await db.invoice.findUnique({ where: { id } })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (invoice.status === 'PAID' || invoice.status === 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'لا يمكن حذف فاتورة تم سدادها أو إرسالها للسداد' }, { status: 400 })
    }

    await db.$transaction(async (tx) => {
      await tx.shipment.updateMany({ where: { invoiceId: id }, data: { invoiceId: null } })
      await tx.invoice.delete({ where: { id } })
    })

    await db.auditLog.create({
      data: { userId: user.id, action: 'DELETE', entity: 'Invoice', entityId: id, afterData: '{}' },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
