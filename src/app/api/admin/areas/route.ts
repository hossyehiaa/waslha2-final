import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, sanitizeInput } from '@/lib/auth-helpers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const zones = await db.zone.findMany({ include: { city: { select: { name: true } } }, orderBy: { name: 'asc' } })
    return NextResponse.json({ zones: zones.map(z => ({ ...z, cityName: z.city?.name })) })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { name, code, cityId } = await req.json()
    if (!name || !code || !cityId) return NextResponse.json({ error: 'Name, code, and city required' }, { status: 400 })
    const zone = await db.zone.create({ data: { name: sanitizeInput(name), code: sanitizeInput(code).toUpperCase(), cityId, status: 'ACTIVE' } })
    return NextResponse.json({ zone }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id, name, code, cityId, status } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const updateData: any = {}
    if (name) updateData.name = sanitizeInput(name)
    if (code) updateData.code = sanitizeInput(code).toUpperCase()
    if (cityId) updateData.cityId = cityId
    if (status) updateData.status = status
    const zone = await db.zone.update({ where: { id }, data: updateData })
    return NextResponse.json({ zone })
  } catch { return NextResponse.json({ error: 'Server error' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.zone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch { return NextResponse.json({ error: 'Cannot delete zone with related data' }, { status: 400 }) }
}
