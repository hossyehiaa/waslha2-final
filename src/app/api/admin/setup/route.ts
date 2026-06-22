import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET - returns data for setup pages based on sub-resource
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const resource = searchParams.get('resource') || 'all'

    if (resource === 'permissions') {
      const templates = await db.permissionTemplate.findMany({ orderBy: { createdAt: 'asc' } })
      return NextResponse.json({ data: templates })
    }

    if (resource === 'reasons') {
      const reasons = await db.cancelReason.findMany({ orderBy: { createdAt: 'asc' } })
      return NextResponse.json({ data: reasons })
    }

    if (resource === 'cities') {
      const cities = await db.city.findMany({
        include: { _count: { select: { zones: true } } },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data: cities.map(c => ({ ...c, zonesCount: c._count.zones })) })
    }

    if (resource === 'areas') {
      const zones = await db.zone.findMany({
        include: { city: { select: { name: true } } },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ data: zones })
    }

    if (resource === 'user-moves') {
      const logs = await db.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, username: true, role: true } } },
      })
      return NextResponse.json({ data: logs })
    }

    // Default: return all setup data
    const [permissions, reasons, cities, areas, zones] = await Promise.all([
      db.permissionTemplate.findMany(),
      db.cancelReason.findMany(),
      db.city.findMany({ include: { _count: { select: { zones: true } } } }),
      db.zone.findMany({ include: { city: { select: { name: true } } } }),
      db.zone.count(),
    ])
    return NextResponse.json({ permissions, reasons, cities, areas, zonesCount: zones })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
