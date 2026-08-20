import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  authenticatePartnerRequest,
  jsonError,
  jsonSuccess,
  logPartnerRequest,
  requestId,
} from '@/lib/partner-api'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  let auth: Awaited<ReturnType<typeof authenticatePartnerRequest>> | null = null
  try {
    auth = await authenticatePartnerRequest(req, 'shipments_read')
    const cities = await db.city.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, name: true, governorate: true },
      orderBy: { name: 'asc' },
    })
    const response = jsonSuccess(cities, 200, { 'X-Request-ID': auth.requestId })
    await logPartnerRequest({ clientId: auth.clientId, apiKeyId: auth.apiKey.id, method: req.method, path: new URL(req.url).pathname, query: new URL(req.url).search, statusCode: response.status, requestId: auth.requestId })
    
    return response
  } catch (error) {
    const response = jsonError(error, auth?.requestId)
    await logPartnerRequest({ clientId: auth?.clientId, apiKeyId: auth?.apiKey.id, method: req.method, path: new URL(req.url).pathname, query: new URL(req.url).search, statusCode: response.status, requestId: auth?.requestId || response.headers.get('X-Request-ID') || requestId(req), errorMessage: error instanceof Error ? error.message : 'request failed' })
    return response
  }
}
