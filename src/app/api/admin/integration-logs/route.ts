import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) return NextResponse.json({ error: 'Forbidden' }, { status: user ? 403 : 401 })
    const params = new URL(req.url).searchParams
    const limit = Math.min(200, Math.max(1, Number(params.get('limit') || 100)))
    const clientId = params.get('clientId')
    const logs = await db.apiRequestLog.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { companyName: true } }, apiKey: { select: { keyPrefix: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Integration logs error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
