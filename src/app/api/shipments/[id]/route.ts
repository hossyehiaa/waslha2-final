import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const shipment = await db.shipment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        senderCity: { select: { name: true } },
        recipientCity: { select: { name: true } },
        fromBranch: { select: { name: true } },
        toBranch: { select: { name: true } },
        driver: { include: { user: { select: { fullName: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Permission check
    if (user.role === 'CLIENT' && shipment.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ shipment })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
