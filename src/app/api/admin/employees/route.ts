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
        { employeeCode: { contains: search } },
      ]
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, phone: true, status: true, lastLoginAt: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        fullName: e.user.fullName,
        username: e.user.username,
        email: e.user.email,
        phone: e.user.phone,
        employeeCode: e.employeeCode,
        position: e.position,
        salary: e.salary,
        status: e.status,
        branch: e.branch?.name,
        hireDate: e.hireDate,
        lastLoginAt: e.user.lastLoginAt,
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
    const position = body.position || 'CLERK'
    const branchId = body.branchId || null
    const salary = Number(body.salary) || 0

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
    const employeeCode = `EMP-${Date.now().toString().slice(-6)}`

    const newUser = await db.user.create({
      data: {
        username,
        email: email || null,
        passwordHash,
        fullName,
        phone: phone || null,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        employeeProfile: {
          create: { employeeCode, position, branchId, salary },
        },
      },
      include: { employeeProfile: true },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Employee',
        entityId: newUser.employeeProfile!.id,
        afterData: JSON.stringify({ username, position }),
      },
    })

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 })
  } catch (e: any) {
    console.error('Create employee error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
