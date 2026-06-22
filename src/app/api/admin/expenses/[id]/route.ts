import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const expense = await db.expense.findUnique({ where: { id } })
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.category) updateData.category = body.category
    if (body.description) updateData.description = sanitizeInput(body.description)
    if (body.amount !== undefined) updateData.amount = Number(body.amount) || 0
    if (body.branchId !== undefined) updateData.branchId = body.branchId || null
    if (body.date) updateData.date = new Date(body.date)

    await db.expense.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Expense',
        entityId: id,
        afterData: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const expense = await db.expense.findUnique({ where: { id } })
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.expense.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Expense',
        entityId: id,
        beforeData: JSON.stringify({ description: expense.description, amount: expense.amount }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
