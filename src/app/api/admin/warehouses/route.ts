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

    const warehouses = await db.warehouse.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        branchId: w.branchId,
        branch: w.branch?.name,
        capacity: w.capacity,
        currentLoad: w.currentLoad,
        address: w.address,
        status: w.status,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = sanitizeInput(body.name || '')
    const code = sanitizeInput(body.code || '').toUpperCase()
    const branchId = body.branchId || null
    const capacity = Number(body.capacity) || 1000
    const address = sanitizeInput(body.address || '')

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code required' }, { status: 400 })
    }

    const existing = await db.warehouse.findFirst({ where: { OR: [{ name }, { code }] } })
    if (existing) {
      return NextResponse.json({ error: 'Warehouse name or code already exists' }, { status: 400 })
    }

    const warehouse = await db.warehouse.create({
      data: { name, code, branchId, capacity, address: address || null, status: 'ACTIVE' },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        afterData: JSON.stringify({ name, code }),
      },
    })

    return NextResponse.json({ warehouse }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
