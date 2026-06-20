import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, verifyPassword, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// Update profile (name, email, phone)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { fullName, email, phone } = body

    const updateData: any = {}
    if (fullName) updateData.fullName = sanitizeInput(fullName)
    if (email !== undefined) {
      const emailClean = email ? sanitizeInput(email).toLowerCase() : null
      if (emailClean) {
        const existing = await db.user.findFirst({
          where: { email: emailClean, NOT: { id: user.id } },
        })
        if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
      updateData.email = emailClean
    }
    if (phone !== undefined) updateData.phone = sanitizeInput(phone || '')

    await db.user.update({
      where: { id: user.id },
      data: updateData,
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        afterData: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}

// Change password
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords required' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const fullUser = await db.user.findUnique({ where: { id: user.id } })
    if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const valid = await verifyPassword(currentPassword, fullUser.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    const newHash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        afterData: JSON.stringify({ passwordChanged: true }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error', details: e.message }, { status: 500 })
  }
}
