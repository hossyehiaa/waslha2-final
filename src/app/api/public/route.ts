import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import {
  authenticatePartnerRequest,
  createPartnerShipment,
  getIdempotentResponse,
  jsonError,
  logPartnerRequest,
  requestHash,
  requestId,
  shipmentInputSchema,
  storeIdempotentResponse,
} from '@/lib/partner-api'

export const runtime = 'nodejs'
const DEPRECATION_HEADERS = { 'X-Deprecated': 'Use /api/integrations/v1 instead' }

function legacyResponse(body: unknown, status: number, requestIdValue: string) {
  return NextResponse.json(body, { status, headers: { ...DEPRECATION_HEADERS, 'X-Request-ID': requestIdValue } })
}

export async function GET(req: NextRequest) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    const params = new URL(req.url).searchParams
    const page = Math.max(1, Number(params.get('page') || 1))
    const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 50)))
    const status = params.get('status')?.toUpperCase()
    const where: any = { clientId: auth.clientId }
    if (status) where.status = status
    const [shipments, total] = await Promise.all([
      db.shipment.findMany({ where, include: { senderCity: { select: { name: true, code: true } }, recipientCity: { select: { name: true, code: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      db.shipment.count({ where }),
    ])
    const response = legacyResponse({ success: true, data: shipments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, 200, auth.requestId)
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: 200, requestId: auth.requestId })
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId || requestId(req))
    response.headers.set('X-Deprecated', DEPRECATION_HEADERS['X-Deprecated'])
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}

export async function POST(req: NextRequest) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_write')
    const raw = await req.json()
    const senderCityId = raw.senderCityId || raw.sender?.cityId
    const recipientCityId = raw.recipientCityId || raw.recipient?.cityId
    const [senderCity, recipientCity] = await Promise.all([
      db.city.findUnique({ where: { id: senderCityId } }),
      db.city.findUnique({ where: { id: recipientCityId } }),
    ])
    if (!senderCity || !recipientCity) return legacyResponse({ error: 'Invalid city id' }, 400, auth.requestId)
    const input = shipmentInputSchema.safeParse({
      sender: { name: raw.senderName || raw.sender?.name, phone: raw.senderPhone || raw.sender?.phone, address: raw.senderAddress || raw.sender?.address, cityCode: senderCity.code },
      recipient: { name: raw.recipientName || raw.recipient?.name, phone: raw.recipientPhone || raw.recipient?.phone, address: raw.recipientAddress || raw.recipient?.address, cityCode: recipientCity.code },
      serviceType: raw.serviceType || 'STANDARD',
      priority: raw.priority || 'NORMAL',
      weight: raw.weight || 0.5,
      pieces: raw.pieces || 1,
      description: raw.description || null,
      codAmount: raw.codAmount || 0,
    })
    if (!input.success) return legacyResponse({ error: 'Invalid shipment data', details: input.error.flatten() }, 400, auth.requestId)
    if (Object.prototype.hasOwnProperty.call(raw, 'shippingCost')) return legacyResponse({ error: 'shippingCost is calculated server-side' }, 400, auth.requestId)

    const hash = requestHash(input.data)
    const idempotencyKey = req.headers.get('idempotency-key')
    const existing = await getIdempotentResponse(idempotencyKey, auth.clientId, path, hash)
    if (existing) return legacyResponse(existing.body, existing.status, auth.requestId)
    const { shipment } = await createPartnerShipment(input.data, auth.clientId, auth.apiKey.client.userId)
    const responseBody = { success: true, data: { id: shipment.id, trackingNumber: shipment.trackingNumber, status: shipment.status, totalCost: shipment.totalCost } }
    if (idempotencyKey) await storeIdempotentResponse(idempotencyKey, auth.clientId, path, hash, 201, responseBody)
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: 201, requestId: auth.requestId })
    void dispatchWebhookEvent(auth.clientId, 'shipment.created', { shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, status: shipment.status, codAmount: shipment.codAmount, totalCost: shipment.totalCost, updatedAt: shipment.updatedAt.toISOString() }).catch((error) => console.error('legacy shipment webhook failed', error))
    return legacyResponse(responseBody, 201, auth.requestId)
  } catch (error) {
    const response = jsonError(error, auth?.requestId || requestId(req))
    response.headers.set('X-Deprecated', DEPRECATION_HEADERS['X-Deprecated'])
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
