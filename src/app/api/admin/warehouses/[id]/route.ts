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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const wh = await db.warehouse.findUnique({ where: { id } })
    if (!wh) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.name) updateData.name = sanitizeInput(body.name)
    if (body.code) updateData.code = sanitizeInput(body.code).toUpperCase()
    if (body.branchId !== undefined) updateData.branchId = body.branchId || null
    if (body.capacity !== undefined) updateData.capacity = Number(body.capacity) || 0
    if (body.address !== undefined) updateData.address = sanitizeInput(body.address || '')
    if (body.status) updateData.status = body.status

    await db.warehouse.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Warehouse',
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const wh = await db.warehouse.findUnique({ where: { id } })
    if (!wh) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (wh.currentLoad > 0) {
      return NextResponse.json({ error: 'Cannot delete warehouse with current load. Empty it first.' }, { status: 400 })
    }

    await db.warehouse.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Warehouse',
        entityId: id,
        beforeData: JSON.stringify({ name: wh.name, code: wh.code }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
