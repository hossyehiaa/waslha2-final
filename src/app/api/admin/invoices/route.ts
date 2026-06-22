import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoices = await db.invoice.findMany({
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        client: i.client.companyName,
        type: i.type,
        amount: i.amount,
        tax: i.tax,
        total: i.total,
        status: i.status,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        createdAt: i.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
