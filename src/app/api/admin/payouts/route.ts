import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payouts = await db.payoutRequest.findMany({
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        client: p.client.companyName,
        amount: p.amount,
        method: p.method,
        bankAccount: p.bankAccount,
        status: p.status,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action } = await req.json()
    const newStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : action === 'pay' ? 'PAID' : null
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const updated = await db.payoutRequest.update({
      where: { id },
      data: { status: newStatus, processedAt: new Date() },
    })

    return NextResponse.json({ payout: updated })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
