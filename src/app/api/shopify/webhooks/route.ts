import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptWebhookSecret, getShopifyAppClientSecret, processShopifyOrderCreated, verifyShopifyHmac, webhookPayloadHash } from '@/lib/shopify'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  if (rawBody.length > 2_000_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })

  const shopDomain = req.headers.get('x-shopify-shop-domain')?.trim().toLowerCase()
  const webhookId = req.headers.get('x-shopify-webhook-id')?.trim()
  const topic = req.headers.get('x-shopify-topic')?.trim().toLowerCase() || 'unknown'
  if (!shopDomain || !webhookId) return NextResponse.json({ error: 'Missing Shopify webhook headers' }, { status: 400 })

  const installation = await db.shopifyInstallation.findUnique({ where: { shopDomain } })
  if (!installation || installation.status !== 'ACTIVE') return NextResponse.json({ error: 'Webhook not registered' }, { status: 404 })

  let secret: string
  try {
    secret = installation.authMode === 'OAUTH' ? getShopifyAppClientSecret() : decryptWebhookSecret(installation.webhookSecretEncrypted)
  } catch {
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 })
  }
  if (!verifyShopifyHmac(rawBody, req.headers.get('x-shopify-hmac-sha256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    await db.shopifyWebhookEvent.create({
      data: { installationId: installation.id, webhookId, topic, payloadHash: webhookPayloadHash(rawBody), status: 'PROCESSING' },
    })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') return NextResponse.json({ received: true, duplicate: true })
    return NextResponse.json({ error: 'Webhook could not be recorded' }, { status: 500 })
  }

  const event = await db.shopifyWebhookEvent.findUnique({ where: { installationId_webhookId: { installationId: installation.id, webhookId } } })
  try {
    const payload = JSON.parse(rawBody)
    if (topic === 'orders/create') await processShopifyOrderCreated(installation.id, payload)
    await db.shopifyWebhookEvent.update({ where: { id: event!.id }, data: { status: topic === 'orders/create' ? 'PROCESSED' : 'IGNORED', processedAt: new Date(), error: null } })
    return NextResponse.json({ received: true })
  } catch {
    await db.shopifyWebhookEvent.update({ where: { id: event!.id }, data: { status: 'FAILED', error: 'Shopify order processing failed' } }).catch(() => undefined)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
