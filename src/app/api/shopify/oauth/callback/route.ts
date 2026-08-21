import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encryptWebhookSecret } from '@/lib/webhooks'
import { exchangeShopifyCode, hashShopifyOAuthState, normalizeShopDomain, registerOrdersWebhook, unregisterWebhook, verifyShopifyOAuthHmac } from '@/lib/shopify'

export const runtime = 'nodejs'

function redirect(req: NextRequest, result: string) {
  const url = new URL('/dashboard/shopify', req.nextUrl.origin)
  url.searchParams.set('shopify', result)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const state = params.get('state') || ''
  const shopRaw = params.get('shop') || ''
  const code = params.get('code') || ''
  if (!state || !shopRaw || !code || params.get('error')) return redirect(req, 'denied')

  try {
    if (!verifyShopifyOAuthHmac(params)) return redirect(req, 'invalid')
    const shopDomain = normalizeShopDomain(shopRaw)
    const stateHash = hashShopifyOAuthState(state)
    if (req.cookies.get('shopify_oauth_state')?.value !== stateHash) return redirect(req, 'invalid')
    const pending = await db.shopifyOAuthState.findUnique({ where: { stateHash } })
    if (!pending || pending.expiresAt < new Date() || pending.shopDomain !== shopDomain) return redirect(req, 'expired')
    await db.shopifyOAuthState.delete({ where: { id: pending.id } })

    const tokens = await exchangeShopifyCode(shopDomain, code)
    const existing = await db.shopifyInstallation.findUnique({ where: { clientId: pending.clientId } })
    if (existing && existing.shopDomain !== shopDomain && existing.ordersWebhookId) {
      await unregisterWebhook(existing, existing.ordersWebhookId).catch(() => undefined)
    }
    const hasSenderConfig = Boolean(existing?.senderName && existing.senderPhone && existing.senderAddress && existing.senderCityId)
    const installation = await db.shopifyInstallation.upsert({
      where: { clientId: pending.clientId },
      create: {
        clientId: pending.clientId,
        shopDomain,
        authMode: 'OAUTH',
        accessTokenEncrypted: encryptWebhookSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptWebhookSecret(tokens.refreshToken),
        accessTokenExpiresAt: tokens.expiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        grantedScopes: tokens.grantedScopes,
        webhookSecretEncrypted: encryptWebhookSecret(process.env.SHOPIFY_CLIENT_SECRET || ''),
        status: 'PENDING_CONFIG',
      },
      update: {
        shopDomain,
        authMode: 'OAUTH',
        accessTokenEncrypted: encryptWebhookSecret(tokens.accessToken),
        refreshTokenEncrypted: encryptWebhookSecret(tokens.refreshToken),
        accessTokenExpiresAt: tokens.expiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        grantedScopes: tokens.grantedScopes,
        webhookSecretEncrypted: encryptWebhookSecret(process.env.SHOPIFY_CLIENT_SECRET || ''),
        status: hasSenderConfig ? 'ACTIVE' : 'PENDING_CONFIG',
        lastError: null,
      },
    })

    let webhookId = existing?.shopDomain === shopDomain ? existing.ordersWebhookId : null
    if (!webhookId) {
      webhookId = await registerOrdersWebhook(installation)
      await db.shopifyInstallation.update({ where: { id: installation.id }, data: { ordersWebhookId: webhookId } })
    }
    return redirect(req, hasSenderConfig ? 'connected' : 'configure')
  } catch {
    return redirect(req, 'error')
  }
}
