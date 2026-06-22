import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const templates = await db.permissionTemplate.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ templates })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { name, description, permissions } = await req.json()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const existing = await db.permissionTemplate.findFirst({ where: { name } })
    if (existing) return NextResponse.json({ error: 'Template already exists' }, { status: 400 })
    const template = await db.permissionTemplate.create({
      data: { name: sanitizeInput(name), description: description || null, permissions: JSON.stringify(permissions || []) },
    })
    return NextResponse.json({ template }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, name, description, permissions } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const updateData: any = {}
    if (name) updateData.name = sanitizeInput(name)
    if (description !== undefined) updateData.description = description
    if (permissions) updateData.permissions = JSON.stringify(permissions)
    const template = await db.permissionTemplate.update({ where: { id }, data: updateData })
    return NextResponse.json({ template })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.permissionTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}
