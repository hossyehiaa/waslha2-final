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

    const accounts = await db.account.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const bankBalance = accounts.filter(a => a.type === 'BANK').reduce((s, a) => s + a.balance, 0)
    const cashBalance = accounts.filter(a => a.type === 'CASH').reduce((s, a) => s + a.balance, 0)
    const walletBalance = accounts.filter(a => a.type === 'WALLET').reduce((s, a) => s + a.balance, 0)

    return NextResponse.json({
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
        branch: a.branch?.name,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
      stats: { totalBalance, bankBalance, cashBalance, walletBalance, accountCount: accounts.length },
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

    const { name, type, balance, branchId } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const account = await db.account.create({
      data: { name, type: type || 'BANK', balance: Number(balance) || 0, branchId: branchId || null },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
