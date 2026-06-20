import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await db.clientAddress.findMany({
      where: { clientId: user.clientId },
      include: { city: { select: { name: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      addresses: addresses.map((a) => ({
        id: a.id,
        label: a.label,
        contactName: a.contactName,
        phone: a.phone,
        cityId: a.cityId,
        city: a.city?.name,
        address: a.address,
        isDefault: a.isDefault,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { label, contactName, phone, cityId, address, isDefault } = body

    if (!label || !contactName || !phone || !cityId || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as default, unset others
    if (isDefault) {
      await db.clientAddress.updateMany({
        where: { clientId: user.clientId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const addr = await db.clientAddress.create({
      data: {
        clientId: user.clientId!,
        label: sanitizeInput(label),
        contactName: sanitizeInput(contactName),
        phone: sanitizeInput(phone),
        cityId,
        address: sanitizeInput(address),
        isDefault: !!isDefault,
      },
    })

    return NextResponse.json({ address: addr }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await db.clientAddress.delete({ where: { id, clientId: user.clientId! } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
