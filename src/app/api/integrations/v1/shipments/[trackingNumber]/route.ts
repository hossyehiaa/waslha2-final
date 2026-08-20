import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  authenticatePartnerRequest,
  jsonError,
  logPartnerRequest,
  requestId,
} from '@/lib/partner-api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ trackingNumber: string }> }) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    const { trackingNumber } = await params
    const shipment = await db.shipment.findFirst({
      where: { trackingNumber, clientId: auth.clientId },
      include: { senderCity: true, recipientCity: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    })
    if (!shipment) {
      const response = jsonError(new Error('not found'), auth.requestId)
      await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: 404, requestId: auth.requestId, errorMessage: 'shipment not found' })
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Shipment not found', details: {}, requestId: auth.requestId } }, { status: 404, headers: { 'X-Request-ID': auth.requestId } })
    }

    const body = {
      data: {
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        paymentStatus: shipment.paymentStatus,
        sender: { name: shipment.senderName, phone: shipment.senderPhone, address: shipment.senderAddress, cityCode: shipment.senderCity.code },
        recipient: { name: shipment.recipientName, phone: shipment.recipientPhone, address: shipment.recipientAddress, cityCode: shipment.recipientCity.code },
        serviceType: shipment.serviceType,
        priority: shipment.priority,
        weight: shipment.weight,
        pieces: shipment.pieces,
        description: shipment.description,
        codAmount: shipment.codAmount,
        shippingCost: shipment.shippingCost,
        codFee: shipment.codFee,
        insuranceFee: shipment.insuranceFee,
        totalCost: shipment.totalCost,
        statusHistory: shipment.statusHistory.map((update) => ({ status: update.status, note: update.note, location: update.location, createdAt: update.createdAt.toISOString() })),
        createdAt: shipment.createdAt.toISOString(),
        updatedAt: shipment.updatedAt.toISOString(),
      },
    }
    const response = NextResponse.json(body, { status: 200, headers: { 'X-Request-ID': auth.requestId } })
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth.requestId })
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId)
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
