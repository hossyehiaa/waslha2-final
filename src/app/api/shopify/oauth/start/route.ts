import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { createShopifyAuthorizationUrl, generateShopifyOAuthState, hashShopifyOAuthState, normalizeShopDomain } from '@/lib/shopify'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'CLIENT' || !user.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const shopDomain = normalizeShopDomain(req.nextUrl.searchParams.get('shop') || '')
    const state = generateShopifyOAuthState()
    await db.shopifyOAuthState.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] } })
    await db.shopifyOAuthState.create({ data: { stateHash: hashShopifyOAuthState(state), clientId: user.clientId, userId: user.id, shopDomain, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } })
    const response = NextResponse.redirect(createShopifyAuthorizationUrl(shopDomain, state))
    response.cookies.set('shopify_oauth_state', crypto.createHash('sha256').update(state).digest('hex'), { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
    return response
  } catch {
    return NextResponse.json({ error: 'Shopify OAuth could not be started' }, { status: 400 })
  }
}
