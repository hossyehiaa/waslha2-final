import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const employee = await db.employee.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Update user fields
    const userUpdate: any = {}
    if (body.fullName) userUpdate.fullName = sanitizeInput(body.fullName)
    if (body.email !== undefined) userUpdate.email = body.email ? sanitizeInput(body.email).toLowerCase() : null
    if (body.phone !== undefined) userUpdate.phone = sanitizeInput(body.phone)
    if (body.password) userUpdate.passwordHash = await hashPassword(body.password)
    if (body.status) userUpdate.status = body.status

    if (Object.keys(userUpdate).length > 0) {
      await db.user.update({
        where: { id: employee.userId },
        data: userUpdate,
      })
    }

    // Update employee fields
    const empUpdate: any = {}
    if (body.position) empUpdate.position = body.position
    if (body.branchId !== undefined) empUpdate.branchId = body.branchId || null
    if (body.salary !== undefined) empUpdate.salary = Number(body.salary) || 0

    if (Object.keys(empUpdate).length > 0) {
      await db.employee.update({
        where: { id },
        data: empUpdate,
      })
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Employee',
        entityId: id,
        afterData: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Update employee error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const employee = await db.employee.findUnique({
      where: { id },
      include: { user: true },
    })
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Prevent self-deletion
    if (employee.userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete the employee (cascade will handle user)
    await db.employee.delete({ where: { id } })
    await db.user.delete({ where: { id: employee.userId } })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Employee',
        entityId: id,
        beforeData: JSON.stringify({ fullName: employee.user.fullName, employeeCode: employee.employeeCode }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Delete employee error:', e)
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
