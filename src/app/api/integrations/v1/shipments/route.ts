import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import {
  authenticatePartnerRequest,
  createPartnerShipment,
  enforceRateLimits,
  getIdempotentResponse,
  jsonError,
  jsonSuccess,
  logPartnerRequest,
  parseShipmentInput,
  requestHash,
  requestId,
  storeIdempotentResponse,
  PartnerApiError,
} from '@/lib/partner-api'

export const runtime = 'nodejs'

function pathname(req: NextRequest) {
  return new URL(req.url).pathname
}

function shipmentResponse(shipment: { id: string; trackingNumber: string; status: string; totalCost: number; createdAt: Date }) {
  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    totalCost: shipment.totalCost,
    createdAt: shipment.createdAt.toISOString(),
  }
}

export async function POST(req: NextRequest) {
  const path = pathname(req)
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_write')
    await enforceRateLimits(auth.clientId, auth.apiKey.id, `${req.method} ${path}`)
    const body = await parseShipmentInput(req)
    const hash = requestHash(body)
    const idempotencyKey = req.headers.get('idempotency-key')
    const existing = await getIdempotentResponse(idempotencyKey, auth.clientId, path, hash)
    if (existing) return NextResponse.json(existing.body, { status: existing.status, headers: { 'X-Request-ID': auth.requestId } })

    const { shipment } = await createPartnerShipment(body, auth.clientId, auth.apiKey.client.userId)
    const responseBody = { data: shipmentResponse(shipment) }
    await storeAndLog(auth, req, idempotencyKey, hash, 201, responseBody)
    void dispatchWebhookEvent(auth.clientId, 'shipment.created', {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      codAmount: shipment.codAmount,
      totalCost: shipment.totalCost,
      updatedAt: shipment.updatedAt.toISOString(),
    }).catch((error) => console.error('shipment.created webhook failed', error))
    return NextResponse.json(responseBody, { status: 201, headers: { 'X-Request-ID': auth.requestId } })
  } catch (error) {
    const response = jsonError(error, auth?.requestId)
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}

async function storeAndLog(
  auth: Awaited<ReturnType<typeof authenticatePartnerRequest>>,
  req: NextRequest,
  idempotencyKey: string | null,
  hash: string,
  statusCode: number,
  responseBody: unknown,
) {
  if (idempotencyKey) {
    await storeIdempotentResponse(idempotencyKey, auth.clientId, new URL(req.url).pathname, hash, statusCode, responseBody)
  }
  await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path: new URL(req.url).pathname, query: new URL(req.url).search, statusCode, requestId: auth.requestId })
}

export async function GET(req: NextRequest) {
  const path = pathname(req)
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    await enforceRateLimits(auth.clientId, auth.apiKey.id, `${req.method} ${path}`)
    const { searchParams } = new URL(req.url)
    const rawPage = Number(searchParams.get('page') || 1)
    const rawLimit = Number(searchParams.get('limit') || 50)
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(100, rawLimit) : 50
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')?.trim().toUpperCase()
    const where: any = { clientId: auth.clientId }
    if (status) {
      const validStatuses = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED']
      if (!validStatuses.includes(status)) throw new PartnerApiError(400, 'VALIDATION_ERROR', 'status is invalid')
      where.status = status
    }
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientPhone: { contains: search, mode: 'insensitive' } },
      ]
    }
    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where,
        include: { senderCity: true, recipientCity: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shipment.count({ where }),
    ])
    const responseBody = { data: shipments.map((shipment) => ({
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      paymentStatus: shipment.paymentStatus,
      serviceType: shipment.serviceType,
      priority: shipment.priority,
      weight: shipment.weight,
      pieces: shipment.pieces,
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
      senderCityCode: shipment.senderCity.code,
      recipientCityCode: shipment.recipientCity.code,
      codAmount: shipment.codAmount,
      totalCost: shipment.totalCost,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    })), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
    const response = NextResponse.json(responseBody, { status: 200, headers: { 'X-Request-ID': auth.requestId, 'X-Total-Count': String(total) } })
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth.requestId })
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId)
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
