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

    const branches = await db.branch.findMany({
      include: {
        city: { select: { name: true } },
        _count: {
          select: { clients: true, employees: true, drivers: true, warehouses: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        phone: b.phone,
        address: b.address,
        city: b.city?.name,
        status: b.status,
        clients: b._count.clients,
        employees: b._count.employees,
        drivers: b._count.drivers,
        warehouses: b._count.warehouses,
        createdAt: b.createdAt,
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
    const { name, code, phone, address, cityId } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code required' }, { status: 400 })
    }

    const branch = await db.branch.create({
      data: { name, code, phone, address, cityId: cityId || null, status: 'ACTIVE' },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Branch',
        entityId: branch.id,
      },
    })

    return NextResponse.json({ branch }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
