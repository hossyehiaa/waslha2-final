import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const cities = await db.city.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ cities })
  } catch {
    return NextResponse.json({ error: 'Unable to load cities' }, { status: 500 })
  }
}
