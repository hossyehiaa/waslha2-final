import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expenses = await db.expense.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: e.amount,
        branch: e.branch?.name,
        branchId: e.branchId,
        date: e.date,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const category = body.category || 'OTHER'
    const description = sanitizeInput(body.description || '')
    const amount = Number(body.amount) || 0
    const branchId = body.branchId || null
    const date = body.date ? new Date(body.date) : new Date()

    if (!description || amount <= 0) {
      return NextResponse.json({ error: 'Description and positive amount required' }, { status: 400 })
    }

    const expense = await db.expense.create({
      data: { category, description, amount, branchId, date },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Expense',
        entityId: expense.id,
        afterData: JSON.stringify({ category, description, amount }),
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
