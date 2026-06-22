import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const zones = await db.zone.findMany({
      include: { city: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        code: z.code,
        city: z.city?.name,
        cityId: z.cityId,
        status: z.status,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
