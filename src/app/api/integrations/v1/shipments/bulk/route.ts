import { NextRequest, NextResponse } from 'next/server'
import { dispatchWebhookEvent } from '@/lib/webhooks'
import {
  authenticatePartnerRequest,
  createPartnerShipment,
  enforceRateLimits,
  getIdempotentResponse,
  jsonError,
  logPartnerRequest,
  requestHash,
  requestId,
  shipmentInputSchema,
  storeIdempotentResponse,
} from '@/lib/partner-api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_write')
    await enforceRateLimits(auth.clientId, auth.apiKey.id, `${req.method} ${path}`)
    let raw: unknown
    try { raw = await req.json() } catch { throw new Error('Request body must be valid JSON') }
    const rows = Array.isArray(raw) ? raw : (raw as { shipments?: unknown[] })?.shipments
    if (!Array.isArray(rows)) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be an array or contain a shipments array', details: {}, requestId: auth.requestId } }, { status: 400, headers: { 'X-Request-ID': auth.requestId } })
    if (!rows.length || rows.length > 100) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Bulk requests must contain between 1 and 100 shipments', details: {}, requestId: auth.requestId } }, { status: 400, headers: { 'X-Request-ID': auth.requestId } })

    const hash = requestHash(rows)
    const idempotencyKey = req.headers.get('idempotency-key')
    const existing = await getIdempotentResponse(idempotencyKey, auth.clientId, path, hash)
    if (existing) return NextResponse.json(existing.body, { status: existing.status, headers: { 'X-Request-ID': auth.requestId } })

    const results: Array<Record<string, unknown>> = []
    for (const [index, row] of rows.entries()) {
      const parsed = shipmentInputSchema.safeParse(row)
      if (!parsed.success) {
        results.push({ index, success: false, error: { code: 'VALIDATION_ERROR', message: 'Shipment data is invalid', details: parsed.error.flatten() } })
        continue
      }
      try {
        const { shipment } = await createPartnerShipment(parsed.data, auth.clientId, auth.apiKey.client.userId)
        results.push({ index, success: true, id: shipment.id, trackingNumber: shipment.trackingNumber, status: shipment.status, totalCost: shipment.totalCost })
        try {
          await dispatchWebhookEvent(auth.clientId, 'shipment.created', { shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, status: shipment.status, codAmount: shipment.codAmount, totalCost: shipment.totalCost, updatedAt: shipment.updatedAt.toISOString() })
        } catch (error) {
          console.error('bulk shipment webhook failed', error)
        }
      } catch (error) {
        results.push({ index, success: false, error: { code: 'CREATE_FAILED', message: error instanceof Error ? error.message : 'Shipment could not be created' } })
      }
    }
    const successCount = results.filter((result) => result.success).length
    const responseBody = { data: { total: rows.length, successCount, failureCount: rows.length - successCount, results } }
    if (idempotencyKey) await storeIdempotentResponse(idempotencyKey, auth.clientId, path, hash, 200, responseBody)
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: 200, requestId: auth.requestId })
    return NextResponse.json(responseBody, { status: 200, headers: { 'X-Request-ID': auth.requestId } })
  } catch (error) {
    const response = jsonError(error, auth?.requestId || requestId(req))
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
