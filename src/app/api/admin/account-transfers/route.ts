import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, generateReference } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transfers = await db.accountTransfer.findMany({
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      transfers: transfers.map(t => ({
        id: t.id,
        reference: t.reference,
        fromAccount: t.fromAccount.name,
        toAccount: t.toAccount.name,
        amount: t.amount,
        reason: t.reason,
        status: t.status,
        createdAt: t.createdAt,
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

    const { fromAccountId, toAccountId, amount, reason } = await req.json()
    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Cannot transfer to same account' }, { status: 400 })
    }

    const transfer = await db.accountTransfer.create({
      data: {
        reference: generateReference('ATR'),
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        reason: reason || null,
      },
    })

    // Update account balances
    await db.account.update({ where: { id: fromAccountId }, data: { balance: { decrement: Number(amount) } } })
    await db.account.update({ where: { id: toAccountId }, data: { balance: { increment: Number(amount) } } })

    return NextResponse.json({ transfer }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
