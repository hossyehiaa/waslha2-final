import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { WEBHOOK_EVENTS } from '@/lib/partner-api'
import { retryWebhookDelivery } from '@/lib/webhooks'

export const runtime = 'nodejs'

async function getOwnedEndpoint(user: Awaited<ReturnType<typeof getCurrentUser>>, id: string) {
  if (!user) return null
  const endpoint = await db.webhookEndpoint.findUnique({ where: { id } })
  if (!endpoint) return null
  if (user.role === 'CLIENT' && endpoint.clientId !== user.clientId) return null
  return endpoint
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const endpoint = await getOwnedEndpoint(user, id)
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.url !== undefined) {
      const parsed = new URL(body.url)
      if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('Webhook URL must use HTTPS in production')
      data.url = parsed.toString()
    }
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || !body.events.length || body.events.some((event: unknown) => !WEBHOOK_EVENTS.includes(event as never))) return NextResponse.json({ error: 'Invalid webhook events' }, { status: 400 })
      data.events = JSON.stringify(Array.from(new Set(body.events)))
    }
    if (body.name !== undefined) data.name = body.name ? String(body.name).trim() : null
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)
    const updated = await db.webhookEndpoint.update({ where: { id }, data })
    return NextResponse.json({ webhook: { id: updated.id, url: updated.url, name: updated.name, description: updated.description, events: JSON.parse(updated.events), secretPrefix: updated.secretPrefix, isActive: updated.isActive, lastSuccessAt: updated.lastSuccessAt, lastFailureAt: updated.lastFailureAt, createdAt: updated.createdAt } })
  } catch (error) {
    console.error('Webhook update error', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const endpoint = await getOwnedEndpoint(user, id)
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.webhookEndpoint.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook revoke error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { id } = await params
    const endpoint = await getOwnedEndpoint(user, id)
    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const body = await req.json()
    if (!body.deliveryId) return NextResponse.json({ error: 'deliveryId is required' }, { status: 400 })
    const result = await retryWebhookDelivery(body.deliveryId, endpoint.clientId)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Webhook retry error', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 })
  }
}
