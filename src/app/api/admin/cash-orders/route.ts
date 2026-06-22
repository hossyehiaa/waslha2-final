import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateReference } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const where: any = {}
    if (type && type !== 'all') where.type = type

    const orders = await db.cashOrder.findMany({
      where,
      include: { account: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        reference: o.reference,
        type: o.type,
        amount: o.amount,
        account: o.account.name,
        reason: o.reason,
        recipient: o.recipient,
        status: o.status,
        notes: o.notes,
        createdAt: o.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, amount, accountId, reason, recipient, notes } = await req.json()
    if (!type || !amount || !accountId || !reason || !recipient) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const order = await db.cashOrder.create({
      data: {
        reference: generateReference(type === 'CASH_OUT' ? 'CO' : 'CI'),
        type,
        amount: Number(amount),
        accountId,
        reason,
        recipient,
        notes: notes || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, action } = await req.json()
    if (action === 'approve') {
      const order = await db.cashOrder.findUnique({ where: { id } })
      if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const updated = await db.cashOrder.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: user.id },
      })

      // Update account balance
      if (order.type === 'CASH_OUT') {
        await db.account.update({ where: { id: order.accountId }, data: { balance: { decrement: order.amount } } })
      } else {
        await db.account.update({ where: { id: order.accountId }, data: { balance: { increment: order.amount } } })
      }

      return NextResponse.json({ order: updated })
    }

    if (action === 'reject') {
      const updated = await db.cashOrder.update({
        where: { id },
        data: { status: 'REJECTED' },
      })
      return NextResponse.json({ order: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
