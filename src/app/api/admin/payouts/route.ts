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
      include: { client: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        client: p.client.companyName,
        clientId: p.clientId,
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

    const { id, action, notes } = await req.json()
    const newStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : action === 'pay' ? 'PAID' : null
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const payout = await db.payoutRequest.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    })
    if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (payout.status === 'PAID' || payout.status === 'REJECTED') {
      return NextResponse.json({ error: `Cannot modify ${payout.status} payout` }, { status: 400 })
    }

    const updated = await db.payoutRequest.update({
      where: { id },
      data: { status: newStatus, processedAt: new Date(), notes: notes || payout.notes },
    })

    // If paid, deduct from client balance
    if (action === 'pay') {
      await db.client.update({
        where: { id: payout.clientId },
        data: {
          codBalance: { decrement: payout.amount },
          codPaid: { increment: payout.amount },
        },
      })
    }

    // Notify client
    if (payout.client?.userId) {
      const messages: Record<string, { title: string; message: string }> = {
        APPROVED: { title: 'Payout Approved', message: `Your payout request of ${payout.amount} EGP has been approved` },
        REJECTED: { title: 'Payout Rejected', message: `Your payout request of ${payout.amount} EGP has been rejected${notes ? `: ${notes}` : ''}` },
        PAID: { title: 'Payout Paid', message: `Your payout of ${payout.amount} EGP has been transferred to your account` },
      }
      const msg = messages[newStatus]
      if (msg) {
        await db.notification.create({
          data: {
            userId: payout.client.userId,
            type: 'PAYMENT',
            title: msg.title,
            message: msg.message,
            isRead: false,
            link: '/dashboard/cod',
          },
        })
      }
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'PayoutRequest',
        entityId: id,
        afterData: JSON.stringify({ status: newStatus }),
      },
    })

    return NextResponse.json({ payout: updated })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
