import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

// GET - list cities
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const cities = await db.city.findMany({
      include: { _count: { select: { zones: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({
      cities: cities.map(c => ({ ...c, zonesCount: c._count.zones })),
    })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

// POST - create city
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { name, code, governorate } = await req.json()
    if (!name || !code) return NextResponse.json({ error: 'Name and code required' }, { status: 400 })
    const existing = await db.city.findFirst({ where: { OR: [{ name }, { code }] } })
    if (existing) return NextResponse.json({ error: 'City already exists' }, { status: 400 })
    const city = await db.city.create({ data: { name: sanitizeInput(name), code: sanitizeInput(code).toUpperCase(), governorate: governorate || null, status: 'ACTIVE' } })
    return NextResponse.json({ city }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

// PATCH - update city
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, name, code, governorate, status } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const updateData: any = {}
    if (name) updateData.name = sanitizeInput(name)
    if (code) updateData.code = sanitizeInput(code).toUpperCase()
    if (governorate !== undefined) updateData.governorate = governorate
    if (status) updateData.status = status
    const city = await db.city.update({ where: { id }, data: updateData })
    return NextResponse.json({ city })
  } catch (e: any) { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

// DELETE - delete city
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.city.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: 'Cannot delete city with related data' }, { status: 400 }) }
}
