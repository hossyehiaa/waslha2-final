import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticatePartnerRequest, jsonError, logPartnerRequest, requestId } from '@/lib/partner-api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    const raw = new URL(req.url).searchParams.get('trackingNumbers') || ''
    const trackingNumbers = Array.from(new Set(raw.split(',').map((value) => value.trim()).filter(Boolean)))
    if (!trackingNumbers.length || trackingNumbers.length > 100) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'trackingNumbers must contain between 1 and 100 values', details: {}, requestId: auth.requestId } }, { status: 400, headers: { 'X-Request-ID': auth.requestId } })
    }
    const shipments = await db.shipment.findMany({
      where: { clientId: auth.clientId, trackingNumber: { in: trackingNumbers } },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    })
    const found = new Set(shipments.map((shipment) => shipment.trackingNumber))
    const responseBody = {
      data: trackingNumbers.map((trackingNumber) => {
        const shipment = shipments.find((item) => item.trackingNumber === trackingNumber)
        return shipment ? { trackingNumber, found: true, id: shipment.id, status: shipment.status, paymentStatus: shipment.paymentStatus, totalCost: shipment.totalCost, statusHistory: shipment.statusHistory.map((update) => ({ status: update.status, note: update.note, createdAt: update.createdAt.toISOString() })) } : { trackingNumber, found: false }
      }),
      meta: { requested: trackingNumbers.length, found: found.size },
    }
    const response = NextResponse.json(responseBody, { status: 200, headers: { 'X-Request-ID': auth.requestId } })
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: 200, requestId: auth.requestId })
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId || requestId(req))
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
