import { NextRequest, NextResponse } from 'next/server'
import { processPendingWebhookDeliveries } from '@/lib/webhooks'

export const runtime = 'nodejs'

function authorized(req: NextRequest) {
  const expected = process.env.WEBHOOK_PROCESS_SECRET || process.env.CRON_SECRET
  const supplied = req.headers.get('x-webhook-process-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(expected && supplied && supplied === expected)
}

async function processPending(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get('limit') || 50)))
  const processed = await processPendingWebhookDeliveries(limit)
  return NextResponse.json({ processed })
}

export async function GET(req: NextRequest) {
  return processPending(req)
}

export async function POST(req: NextRequest) {
  return processPending(req)
}
