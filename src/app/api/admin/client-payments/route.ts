import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET /api/admin/client-payments — سداد العملاء history (with screenshot proofs)
// Optional: ?clientId=...&limit=...
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const limit = Math.min(200, Number(searchParams.get('limit') || 100))

    const where: any = {}
    if (clientId && clientId !== 'all') where.clientId = clientId

    const payments = await db.clientPayment.findMany({
      where,
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        client: p.client.companyName,
        clientId: p.clientId,
        amount: p.amount,
        method: p.method,
        note: p.note,
        hasProof: !!p.proofUrl,
        proofUrl: p.proofUrl,
        invoiceCount: p.invoiceCount,
        createdAt: p.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
