import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const cities = await db.city.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { zones: true } } },
    })

    return NextResponse.json({
      cities: cities.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        governorate: c.governorate,
        zones: c._count.zones,
        status: c.status,
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

    const { name, code, governorate } = await req.json()
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code required' }, { status: 400 })
    }

    const city = await db.city.create({ data: { name, code, governorate, status: 'ACTIVE' } })
    return NextResponse.json({ city }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
