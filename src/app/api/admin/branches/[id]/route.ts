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

    const branch = await db.branch.findUnique({ where: { id } })
    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: any = {}
    if (body.name) updateData.name = sanitizeInput(body.name)
    if (body.code) updateData.code = sanitizeInput(body.code).toUpperCase()
    if (body.phone !== undefined) updateData.phone = sanitizeInput(body.phone || '')
    if (body.address !== undefined) updateData.address = sanitizeInput(body.address || '')
    if (body.cityId !== undefined) updateData.cityId = body.cityId || null
    if (body.status) updateData.status = body.status

    await db.branch.update({ where: { id }, data: updateData })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Branch',
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
    const branch = await db.branch.findUnique({ where: { id } })
    if (!branch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check if branch has dependent entities
    const counts = await db.branch.findUnique({
      where: { id },
      include: { _count: { select: { clients: true, employees: true, drivers: true, warehouses: true } } },
    })
    if (counts && (counts._count.clients > 0 || counts._count.employees > 0 || counts._count.drivers > 0 || counts._count.warehouses > 0)) {
      return NextResponse.json({
        error: `Cannot delete branch with ${counts._count.clients} clients, ${counts._count.employees} employees, ${counts._count.drivers} drivers, ${counts._count.warehouses} warehouses. Reassign them first.`
      }, { status: 400 })
    }

    await db.branch.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Branch',
        entityId: id,
        beforeData: JSON.stringify({ name: branch.name, code: branch.code }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
