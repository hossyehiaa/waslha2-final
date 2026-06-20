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
