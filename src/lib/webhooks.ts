import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  PartnerApiError,
  WEBHOOK_EVENTS,
  WebhookEvent,
  generateWebhookSecret,
  keyPrefix,
  webhookEvents,
  webhookSignature,
} from '@/lib/partner-api'

const TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 8000)
const MAX_ATTEMPTS = Number(process.env.WEBHOOK_RETRY_ATTEMPTS || 3)

function encryptionKey() {
  const seed = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY || process.env.ADMIN_SESSION_SECRET
  if (!seed) throw new PartnerApiError(500, 'CONFIGURATION_ERROR', 'Webhook secret encryption is not configured')
  return crypto.createHash('sha256').update(seed).digest()
}

export function encryptWebhookSecret(secret: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptWebhookSecret(value: string) {
  const [ivPart, tagPart, cipherPart] = value.split('.')
  if (!ivPart || !tagPart || !cipherPart) throw new PartnerApiError(500, 'CONFIGURATION_ERROR', 'Stored webhook secret is invalid')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(cipherPart, 'base64url')), decipher.final()]).toString('utf8')
}

export async function createWebhookEndpoint(params: {
  clientId: string
  url: string
  events: string[]
  name?: string | null
  description?: string | null
}) {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(params.url)
  } catch {
    throw new PartnerApiError(400, 'VALIDATION_ERROR', 'Webhook URL is invalid')
  }
  if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new PartnerApiError(400, 'VALIDATION_ERROR', 'Webhook URL must use HTTPS in production')
  }
  const events = Array.from(new Set(params.events)).filter((event): event is WebhookEvent => WEBHOOK_EVENTS.includes(event as WebhookEvent))
  if (!events.length) throw new PartnerApiError(400, 'VALIDATION_ERROR', 'At least one valid webhook event is required')

  const secret = generateWebhookSecret()
  const endpoint = await db.webhookEndpoint.create({
    data: {
      clientId: params.clientId,
      url: parsedUrl.toString(),
      events: JSON.stringify(events),
      name: params.name || null,
      description: params.description || null,
      secretHash: await bcrypt.hash(secret, 12),
      secretEncrypted: encryptWebhookSecret(secret),
      secretPrefix: keyPrefix(secret),
    },
  })
  return { endpoint, secret }
}

async function deliver(deliveryId: string, endpoint: { id: string; url: string; secretEncrypted: string | null }, payload: string, event: WebhookEvent, attemptNumber: number) {
  const startedAt = Date.now()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  let responseStatus: number | null = null
  let responseBody: string | null = null
  let error: string | null = null
  let status = 'FAILED'
  let nextAttemptAt: Date | null = null
  try {
    if (!endpoint.secretEncrypted) throw new Error('Webhook secret is unavailable for signing')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Wslahali-Partner-Webhooks/1.0',
        'X-Wslahali-Event': event,
        'X-Wslahali-Delivery-ID': deliveryId,
        'X-Wslahali-Timestamp': timestamp,
        'X-Wslahali-Signature': webhookSignature(timestamp, payload, decryptWebhookSecret(endpoint.secretEncrypted)),
      },
      body: payload,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    responseStatus = response.status
    responseBody = (await response.text()).slice(0, 4000)
    if (response.ok) status = 'SUCCESS'
    else error = `Webhook returned HTTP ${response.status}`
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Webhook delivery failed'
  }

  if (status !== 'SUCCESS' && attemptNumber < MAX_ATTEMPTS) {
    nextAttemptAt = new Date(Date.now() + (attemptNumber === 1 ? 60_000 : 300_000))
    status = 'PENDING'
  }

  await db.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status,
      responseStatus,
      responseBody,
      error,
      attemptNumber,
      nextAttemptAt,
      deliveredAt: status === 'SUCCESS' ? new Date() : null,
      updatedAt: new Date(),
    },
  })
  await db.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: status === 'SUCCESS' ? { lastSuccessAt: new Date() } : { lastFailureAt: new Date() },
  })
  return { status, responseStatus, elapsedMs: Date.now() - startedAt }
}

export async function dispatchWebhookEvent(clientId: string, event: WebhookEvent, data: Record<string, unknown>) {
  const endpoints = await db.webhookEndpoint.findMany({ where: { clientId, isActive: true } })
  const payload = JSON.stringify({ event, createdAt: new Date().toISOString(), data })
  for (const endpoint of endpoints) {
    if (!webhookEvents(endpoint.events).includes(event)) continue
    const delivery = await db.webhookDelivery.create({
      data: { webhookEndpointId: endpoint.id, event, payload, status: 'PENDING', attemptNumber: 1 },
    })
    await deliver(delivery.id, endpoint, payload, event, 1)
  }
}

export async function retryWebhookDelivery(deliveryId: string, clientId: string) {
  const delivery = await db.webhookDelivery.findFirst({ where: { id: deliveryId, webhookEndpoint: { clientId } }, include: { webhookEndpoint: true } })
  if (!delivery) throw new PartnerApiError(404, 'NOT_FOUND', 'Webhook delivery not found')
  const attemptNumber = Math.min(delivery.attemptNumber + 1, MAX_ATTEMPTS)
  return deliver(delivery.id, delivery.webhookEndpoint, delivery.payload, delivery.event as WebhookEvent, attemptNumber)
}

export async function processPendingWebhookDeliveries(limit = 50) {
  const pending = await db.webhookDelivery.findMany({
    where: { status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
    include: { webhookEndpoint: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
  for (const delivery of pending) {
    await deliver(delivery.id, delivery.webhookEndpoint, delivery.payload, delivery.event as WebhookEvent, delivery.attemptNumber)
  }
  return pending.length
}
