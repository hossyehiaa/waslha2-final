import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTrackingNumber, isValidPhone } from '@/lib/auth-helpers'

export const PARTNER_BASE_PATH = '/api/integrations/v1'
export const LEGACY_BASE_PATH = '/api/public'
export const DEFAULT_RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE || 100)
export const DEFAULT_DAILY_CREATION_LIMIT = Number(process.env.RATE_LIMIT_SHIPMENTS_PER_DAY || 2000)
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

export const WEBHOOK_EVENTS = [
  'shipment.created',
  'shipment.status_changed',
  'shipment.picked_up',
  'shipment.in_transit',
  'shipment.out_for_delivery',
  'shipment.delivered',
  'shipment.failed',
  'shipment.returned',
  'shipment.cancelled',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]
export type PartnerScope = 'shipments_read' | 'shipments_write'

export class PartnerApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'PartnerApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function jsonSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers })
}

export function jsonError(error: unknown, fallbackRequestId?: string) {
  const requestId = fallbackRequestId || crypto.randomUUID()
  if (error instanceof PartnerApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details || {}, requestId } },
      { status: error.status, headers: { 'X-Request-ID': requestId } },
    )
  }

  console.error(`[partner-api:${requestId}]`, error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred', details: {}, requestId } },
    { status: 500, headers: { 'X-Request-ID': requestId } },
  )
}

export function requestId(req: NextRequest) {
  return req.headers.get('x-request-id') || crypto.randomUUID()
}

export function getApiKeyFromRequest(req: NextRequest) {
  const authorization = req.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim()
  return req.headers.get('x-api-key')?.trim() || null
}

export function generatePartnerApiKey() {
  return `wsl_${crypto.randomBytes(24).toString('base64url').slice(0, 32)}`
}

export function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('base64url').slice(0, 32)}`
}

export function keyPrefix(value: string) {
  return value.slice(0, 12)
}

export function parseScopes(value: string | null | undefined): PartnerScope[] {
  const normalized = String(value || '')
    .split(/[\s,]+/)
    .map((scope) => scope.trim().toLowerCase().replace(/:/g, '_'))
    .filter(Boolean)
  return Array.from(new Set(normalized)).filter(
    (scope): scope is PartnerScope => scope === 'shipments_read' || scope === 'shipments_write',
  )
}

export function scopeLabel(scope: PartnerScope) {
  return scope.replace('_', ':')
}

export function hasScope(scopes: string | null | undefined, required: PartnerScope) {
  return parseScopes(scopes).includes(required)
}

async function migrateLegacyKey(rawKey: string) {
  const legacy = await db.apiKey.findFirst({
    where: { key: rawKey, isActive: true },
    include: { client: true },
  })
  if (!legacy) return null

  const hash = await bcrypt.hash(rawKey, 12)
  const migrated = await db.apiKey.update({
    where: { id: legacy.id },
    data: { keyHash: hash, keyPrefix: keyPrefix(rawKey), key: null, updatedAt: new Date() },
    include: { client: true },
  })
  return migrated
}

export type PartnerAuth = {
  apiKey: Awaited<ReturnType<typeof db.apiKey.findFirst>> & { client: { id: string; userId: string; status: string } }
  clientId: string
  requestId: string
}

export async function authenticatePartnerRequest(
  req: NextRequest,
  requiredScope?: PartnerScope,
): Promise<PartnerAuth> {
  const rawKey = getApiKeyFromRequest(req)
  if (!rawKey || !rawKey.startsWith('wsl_')) {
    throw new PartnerApiError(401, 'UNAUTHORIZED', 'A valid API key is required')
  }

  const candidates = await db.apiKey.findMany({
    where: { isActive: true, keyPrefix: keyPrefix(rawKey), keyHash: { not: null } },
    include: { client: true },
  })
  let matched = null as (typeof candidates)[number] | null
  for (const candidate of candidates) {
    if (candidate.keyHash && await bcrypt.compare(rawKey, candidate.keyHash)) {
      matched = candidate
      break
    }
  }
  if (!matched) matched = await migrateLegacyKey(rawKey)
  if (!matched || !matched.client || matched.client.status !== 'ACTIVE') {
    throw new PartnerApiError(401, 'UNAUTHORIZED', 'The API key is invalid or suspended')
  }
  if (requiredScope && !hasScope(matched.scopes, requiredScope)) {
    throw new PartnerApiError(403, 'INSUFFICIENT_SCOPE', `The API key requires the ${scopeLabel(requiredScope)} scope`)
  }

  await db.apiKey.update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } })
  return { apiKey: matched as PartnerAuth['apiKey'], clientId: matched.clientId, requestId: requestId(req) }
}

export const shipmentInputSchema = z.object({
  sender: z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().refine(isValidPhone, 'sender.phone is invalid'),
    address: z.string().trim().min(1).max(500),
    cityCode: z.string().trim().min(2).max(16).transform((value) => value.toUpperCase()),
  }),
  recipient: z.object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().refine(isValidPhone, 'recipient.phone is invalid'),
    address: z.string().trim().min(1).max(500),
    cityCode: z.string().trim().min(2).max(16).transform((value) => value.toUpperCase()),
  }),
  serviceType: z.enum(['STANDARD', 'EXPRESS', 'SAME_DAY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  weight: z.coerce.number().positive().max(1000),
  pieces: z.coerce.number().int().positive().max(1000).default(1),
  description: z.string().trim().max(2000).optional().nullable(),
  codAmount: z.coerce.number().min(0).max(100000000).default(0),
})

export type PartnerShipmentInput = z.infer<typeof shipmentInputSchema>

export async function parseShipmentInput(req: NextRequest): Promise<PartnerShipmentInput> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new PartnerApiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON')
  }
  const result = shipmentInputSchema.safeParse(body)
  if (!result.success) {
    throw new PartnerApiError(400, 'VALIDATION_ERROR', 'Shipment data is invalid', result.error.flatten())
  }
  if (Object.prototype.hasOwnProperty.call(body as object, 'shippingCost')) {
    throw new PartnerApiError(400, 'INVALID_FIELD', 'shippingCost is calculated server-side and must not be provided')
  }
  return result.data
}

export async function getActiveCityByCode(code: string) {
  const city = await db.city.findFirst({ where: { code, status: 'ACTIVE' } })
  if (!city) throw new PartnerApiError(400, 'INVALID_CITY', `Active city ${code} does not exist`)
  return city
}

export type ShippingQuote = { shippingCost: number; codFee: number; totalCost: number }

export async function calculateShippingCost(input: PartnerShipmentInput, senderCityId: string, recipientCityId: string): Promise<ShippingQuote> {
  const rule = await db.pricingRule.findFirst({
    where: {
      status: 'ACTIVE',
      serviceType: input.serviceType,
      OR: [
        { fromCityId: senderCityId, toCityId: recipientCityId },
        { fromCityId: null, toCityId: null },
      ],
    },
    orderBy: [{ fromCityId: 'desc' }, { toCityId: 'desc' }],
  })

  let shippingCost: number
  let codFee: number
  if (rule) {
    const extraWeight = Math.max(0, input.weight - rule.baseWeight)
    shippingCost = rule.basePrice + Math.ceil(extraWeight) * rule.perKgPrice
    codFee = input.codAmount > 0 ? Math.max(5, input.codAmount * (rule.codFeePercent / 100)) : 0
    if (input.priority === 'HIGH') shippingCost += 10
    if (input.priority === 'URGENT') shippingCost += 20
    if (senderCityId !== recipientCityId) shippingCost += 15
  } else {
    const multiplier = input.serviceType === 'EXPRESS' ? 1.5 : input.serviceType === 'SAME_DAY' ? 2 : 1
    const priorityFee = input.priority === 'HIGH' ? 10 : input.priority === 'URGENT' ? 20 : 0
    const weightFee = Math.max(0, Math.ceil(input.weight - 1)) * 5
    const interCityFee = senderCityId !== recipientCityId ? 15 : 0
    shippingCost = 30 * multiplier + priorityFee + weightFee + interCityFee
    codFee = input.codAmount > 0 ? Math.max(5, input.codAmount * 0.01) : 0
  }

  const round = (value: number) => Math.round(value * 100) / 100
  return { shippingCost: round(shippingCost), codFee: round(codFee), totalCost: round(shippingCost + codFee) }
}

export async function createPartnerShipment(input: PartnerShipmentInput, clientId: string, createdById: string) {
  const senderCity = await getActiveCityByCode(input.sender.cityCode)
  const recipientCity = await getActiveCityByCode(input.recipient.cityCode)
  const quote = await calculateShippingCost(input, senderCity.id, recipientCity.id)
  let trackingNumber = generateTrackingNumber()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await db.shipment.findUnique({ where: { trackingNumber }, select: { id: true } })
    if (!exists) break
    trackingNumber = generateTrackingNumber()
  }

  return db.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        trackingNumber,
        clientId,
        createdById,
        senderName: input.sender.name,
        senderPhone: input.sender.phone,
        senderAddress: input.sender.address,
        senderCityId: senderCity.id,
        recipientName: input.recipient.name,
        recipientPhone: input.recipient.phone,
        recipientAddress: input.recipient.address,
        recipientCityId: recipientCity.id,
        serviceType: input.serviceType,
        priority: input.priority,
        weight: input.weight,
        pieces: input.pieces,
        description: input.description || null,
        shippingCost: quote.shippingCost,
        codAmount: input.codAmount,
        codFee: quote.codFee,
        totalCost: quote.totalCost,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
      include: { statusHistory: true },
    })
    await tx.shipmentStatus.create({
      data: { shipmentId: shipment.id, status: 'PENDING', note: 'Shipment created through Partner API', createdBy: createdById },
    })
    await tx.client.update({ where: { id: clientId }, data: { totalShipments: { increment: 1 }, activeShipments: { increment: 1 } } })
    return { shipment, quote }
  })
}

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED', 'RETURNED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['PENDING', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
}

export async function updateShipmentStatus(params: {
  shipmentId: string
  status: string
  note?: string | null
  location?: string | null
  changedBy?: string | null
  driverId?: string | null
  failureReason?: string | null
}) {
  const { shipmentId, status, note, location, changedBy, driverId, failureReason } = params
  const shipment = await db.shipment.findUnique({ where: { id: shipmentId }, include: { client: true } })
  if (!shipment) throw new PartnerApiError(404, 'NOT_FOUND', 'Shipment not found')
  const allowed = STATUS_TRANSITIONS[shipment.status] || []
  if (status !== shipment.status && !allowed.includes(status)) {
    throw new PartnerApiError(400, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${shipment.status} to ${status}`, { allowed })
  }

  const now = new Date()
  const updateData: Record<string, unknown> = { status }
  if (driverId !== undefined) updateData.driverId = driverId || null
  if (failureReason !== undefined) updateData.failureReason = failureReason || null
  if (status === 'PICKED_UP' && !shipment.pickupAt) updateData.pickupAt = now
  if (status === 'DELIVERED') {
    updateData.deliveredAt = now
    if (shipment.codAmount > 0 && shipment.paymentStatus === 'PENDING') {
      updateData.paymentStatus = 'COLLECTED'
      updateData.codCollectedAt = now
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const next = await tx.shipment.update({ where: { id: shipmentId }, data: updateData })
    await tx.shipmentStatus.create({ data: { shipmentId, status, note: note || null, location: location || null, createdBy: changedBy || null } })
    return next
  })
  return { shipment: updated, previousStatus: shipment.status }
}

export function requestHash(body: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

export async function getIdempotentResponse(key: string | null, clientId: string, endpoint: string, hash: string) {
  if (!key) return null
  if (key.length > 200) throw new PartnerApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key is too long')
  const record = await db.idempotencyKey.findUnique({ where: { key_clientId_endpoint: { key, clientId, endpoint } } })
  if (!record) return null
  if (record.expiresAt <= new Date()) {
    await db.idempotencyKey.delete({ where: { id: record.id } }).catch(() => {})
    return null
  }
  if (record.requestHash !== hash) throw new PartnerApiError(409, 'IDEMPOTENCY_CONFLICT', 'The idempotency key was already used with a different request')
  if (!record.responseBody || !record.responseStatus) return null
  return { body: JSON.parse(record.responseBody), status: record.responseStatus }
}

export async function storeIdempotentResponse(key: string | null, clientId: string, endpoint: string, hash: string, status: number, body: unknown) {
  if (!key) return
  await db.idempotencyKey.upsert({
    where: { key_clientId_endpoint: { key, clientId, endpoint } },
    create: { key, clientId, endpoint, requestHash: hash, responseStatus: status, responseBody: JSON.stringify(body), expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) },
    update: { requestHash: hash, responseStatus: status, responseBody: JSON.stringify(body), expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS) },
  })
}

export async function enforceRateLimits(clientId: string, apiKeyId: string, path: string) {
  const now = new Date()
  const minuteAgo = new Date(now.getTime() - 60_000)
  const minuteCount = await db.apiRequestLog.count({ where: { apiKeyId, createdAt: { gte: minuteAgo } } })
  if (minuteCount >= DEFAULT_RATE_LIMIT_PER_MINUTE) throw new PartnerApiError(429, 'RATE_LIMITED', 'Too many requests')
  if (path.includes('/shipments') && path.includes('POST')) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const dailyCount = await db.apiRequestLog.count({ where: { apiKeyId, clientId, method: 'POST', path: { contains: '/shipments' }, createdAt: { gte: dayAgo } } })
    if (dailyCount >= DEFAULT_DAILY_CREATION_LIMIT) throw new PartnerApiError(429, 'DAILY_CREATION_LIMIT', 'The daily shipment creation limit has been reached')
  }
}

export async function logPartnerRequest(params: {
  clientId?: string | null
  apiKeyId?: string | null
  method: string
  path: string
  query?: string | null
  statusCode: number
  requestId: string
  errorMessage?: string | null
}) {
  await db.apiRequestLog.create({ data: { ...params } }).catch((error) => console.error('Partner API request log failed', error))
}

export function webhookSignature(timestamp: string, rawBody: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

export function webhookEvents(value: string | null | undefined): WebhookEvent[] {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.filter((event): event is WebhookEvent => WEBHOOK_EVENTS.includes(event)) : []
  } catch {
    return []
  }
}
