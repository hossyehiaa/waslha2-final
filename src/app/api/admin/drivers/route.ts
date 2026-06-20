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
        { user: { fullName: { contains: search } } },
        { user: { username: { contains: search } } },
        { driverCode: { contains: search } },
      ]
    }

    const drivers = await db.driver.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, phone: true, status: true, lastLoginAt: true, fullName: true } },
        branch: { select: { name: true } },
        zone: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      drivers: drivers.map((d) => ({
        id: d.id,
        fullName: d.user.fullName,
        username: d.user.username,
        email: d.user.email,
        phone: d.user.phone,
        driverCode: d.driverCode,
        vehicleType: d.vehicleType,
        vehiclePlate: d.vehiclePlate,
        status: d.status,
        rating: d.rating,
        totalDeliveries: d.totalDeliveries,
        totalEarnings: d.totalEarnings,
        pendingEarnings: d.pendingEarnings,
        branch: d.branch?.name,
        zone: d.zone?.name,
        joinDate: d.joinDate,
        lastLoginAt: d.user.lastLoginAt,
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const username = sanitizeInput(body.username || '').toLowerCase()
    const email = sanitizeInput(body.email || '').toLowerCase()
    const fullName = sanitizeInput(body.fullName || '')
    const phone = sanitizeInput(body.phone || '')
    const password = body.password || ''
    const vehicleType = body.vehicleType || 'MOTORCYCLE'
    const vehiclePlate = sanitizeInput(body.vehiclePlate || '')
    const branchId = body.branchId || null
    const zoneId = body.zoneId || null

    if (!username || !fullName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const driverCode = `DRV-${Date.now().toString().slice(-6)}`

    const newUser = await db.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        fullName,
        phone: phone || null,
        role: 'DRIVER',
        status: 'ACTIVE',
        driverProfile: {
          create: { driverCode, vehicleType, vehiclePlate, branchId, zoneId },
        },
      },
      include: { driverProfile: true },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Driver',
        entityId: newUser.driverProfile!.id,
        afterData: JSON.stringify({ username, vehicleType }),
      },
    })

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 })
  } catch (e: any) {
    console.error('Create driver error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
