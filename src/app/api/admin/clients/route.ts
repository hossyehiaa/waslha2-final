import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = {}
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { user: { username: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, phone: true, status: true, lastLoginAt: true } },
        branch: { select: { name: true } },
        city: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      clients: clients.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        username: c.user.username,
        email: c.user.email,
        phone: c.user.phone,
        status: c.status,
        rating: c.rating,
        totalShipments: c.totalShipments,
        activeShipments: c.activeShipments,
        codBalance: c.codBalance,
        codCollected: c.codCollected,
        codPaid: c.codPaid,
        codPending: c.codPending,
        shippingBalance: c.shippingBalance,
        branch: c.branch?.name,
        city: c.city?.name,
        createdAt: c.createdAt,
        lastLoginAt: c.user.lastLoginAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const username = sanitizeInput(body.username || '').toLowerCase()
    const email = sanitizeInput(body.email || '').toLowerCase()
    const fullName = sanitizeInput(body.fullName || body.companyName || '')
    const phone = sanitizeInput(body.phone || '')
    const password = body.password || ''
    const companyName = sanitizeInput(body.companyName || '')

    if (!username || !fullName || !password || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check uniqueness
    const existing = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const newUser = await db.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        fullName,
        phone: phone || null,
        role: 'CLIENT',
        status: 'ACTIVE',
        clientProfile: {
          create: {
            companyName,
            branchId: body.branchId || null,
            cityId: body.cityId || null,
            address: body.address || null,
            creditLimit: Number(body.creditLimit) || 0,
            taxNumber: body.taxNumber || null,
            commercialReg: body.commercialReg || null,
          },
        },
      },
      include: { clientProfile: true },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Client',
        entityId: newUser.clientProfile!.id,
        afterData: JSON.stringify({ username, companyName }),
      },
    })

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 })
  } catch (e: any) {
    console.error('Create client error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
