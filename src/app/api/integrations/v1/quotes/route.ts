import { NextRequest, NextResponse } from 'next/server'
import {
  authenticatePartnerRequest,
  calculateShippingCost,
  enforceRateLimits,
  getActiveCityByCode,
  jsonError,
  logPartnerRequest,
  parseShipmentInput,
  requestId,
} from '@/lib/partner-api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const path = new URL(req.url).pathname
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    await enforceRateLimits(auth.clientId, auth.apiKey.id, `${req.method} ${path}`)
    const input = await parseShipmentInput(req)
    const [senderCity, recipientCity] = await Promise.all([
      getActiveCityByCode(input.sender.cityCode),
      getActiveCityByCode(input.recipient.cityCode),
    ])
    const quote = await calculateShippingCost(input, senderCity.id, recipientCity.id)
    const responseBody = {
      data: {
        serviceType: input.serviceType,
        weight: input.weight,
        senderCityCode: senderCity.code,
        recipientCityCode: recipientCity.code,
        shippingCost: quote.shippingCost,
        codFee: quote.codFee,
        totalCost: quote.totalCost,
        currency: 'EGP',
      },
    }
    const response = NextResponse.json(responseBody, { status: 200, headers: { 'X-Request-ID': auth.requestId } })
    await logPartnerRequest({
      clientId: auth.clientId,
      apiKeyId: auth.apiKey.id,
      method: req.method,
      path,
      query: new URL(req.url).search,
      statusCode: response.status,
      requestId: auth.requestId,
    })
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId || requestId(req))
    await logPartnerRequest({
      clientId: auth?.clientId,
      apiKeyId: auth?.apiKey.id,
      method: req.method,
      path,
      query: new URL(req.url).search,
      statusCode: response.status,
      requestId: auth?.requestId || requestId(req),
      errorMessage: error instanceof Error ? error.message : 'quote request failed',
    })
    return response
  }
}
