import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { WEBHOOK_EVENTS } from '@/lib/partner-api'
import { createWebhookEndpoint } from '@/lib/webhooks'

export const runtime = 'nodejs'

async function resolveClientId(user: Awaited<ReturnType<typeof getCurrentUser>>, requested?: string | null) {
  if (!user) return null
  return user.role === 'CLIENT' ? user.clientId || null : requested || null
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const clientId = await resolveClientId(user, new URL(req.url).searchParams.get('clientId'))
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })
    const endpoints = await db.webhookEndpoint.findMany({
      where: { clientId },
      include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ webhooks: endpoints.map((endpoint) => ({ id: endpoint.id, url: endpoint.url, name: endpoint.name, description: endpoint.description, events: JSON.parse(endpoint.events), secretPrefix: endpoint.secretPrefix, isActive: endpoint.isActive, lastSuccessAt: endpoint.lastSuccessAt, lastFailureAt: endpoint.lastFailureAt, createdAt: endpoint.createdAt, deliveries: endpoint.deliveries })) })
  } catch (error) {
    console.error('Webhook list error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const clientId = await resolveClientId(user, body.clientId)
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })
    const events = Array.isArray(body.events) ? body.events : []
    const invalid = events.filter((event: unknown) => !WEBHOOK_EVENTS.includes(event as never))
    if (invalid.length) return NextResponse.json({ error: 'One or more webhook events are invalid', details: { invalid } }, { status: 400 })
    const { endpoint, secret } = await createWebhookEndpoint({ clientId, url: body.url, events, name: body.name, description: body.description })
    return NextResponse.json({ id: endpoint.id, url: endpoint.url, name: endpoint.name, events, secret, message: 'Save this webhook secret securely; it will not be shown again' }, { status: 201 })
  } catch (error) {
    console.error('Webhook create error', error)
    const status = error instanceof Error && error.name === 'PartnerApiError' ? 400 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status })
  }
}
