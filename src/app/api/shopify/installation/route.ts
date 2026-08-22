import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-helpers'
import { encryptWebhookSecret, normalizeShopDomain, registerOrdersWebhook, unregisterWebhook } from '@/lib/shopify'

export const runtime = 'nodejs'

function canManage(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return Boolean(user && (user.role === 'CLIENT' || user.role === 'ADMIN' || user.role === 'EMPLOYEE'))
}

function responseFor(installation: { id: string; shopDomain: string; authMode?: string | null; grantedScopes: string; senderName: string | null; senderPhone: string | null; senderAddress: string | null; senderCityId: string | null; apiVersion: string; status: string; lastSyncAt: Date | null; lastError: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: installation.id,
    shopDomain: installation.shopDomain,
    authMode: installation.authMode || 'MANUAL',
    grantedScopes: String(installation.grantedScopes || '').split(',').map((scope) => scope.trim()).filter(Boolean),
    senderName: installation.senderName,
    senderPhone: installation.senderPhone,
    senderAddress: installation.senderAddress,
    senderCityId: installation.senderCityId,
    apiVersion: installation.apiVersion,
    status: installation.status,
    lastSyncAt: installation.lastSyncAt,
    lastError: installation.lastError,
    createdAt: installation.createdAt,
    updatedAt: installation.updatedAt,
  }
}

export async function GET() {
  let stage = 'session'
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT' || !user.clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    stage = 'database'
    const installation = await db.shopifyInstallation.findUnique({
      where: { clientId: user.clientId },
      select: {
        id: true,
        shopDomain: true,
        authMode: true,
        grantedScopes: true,
        senderName: true,
        senderPhone: true,
        senderAddress: true,
        senderCityId: true,
        apiVersion: true,
        status: true,
        lastSyncAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    stage = 'serialize'
    return NextResponse.json({ installation: installation ? responseFor(installation) : null })
  } catch (error) {
    const safeCode = `SHOPIFY_CONNECTION_${stage.toUpperCase()}_FAILED`
    console.error(`[Shopify] ${safeCode}:`, error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Unable to load Shopify connection', code: safeCode }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT' || !user.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const senderName = String(body.senderName || '').trim()
    const senderPhone = String(body.senderPhone || '').trim()
    const senderAddress = String(body.senderAddress || '').trim()
    const senderCityId = String(body.senderCityId || '').trim()
    if (!senderName || !senderPhone || !senderAddress || !senderCityId) return NextResponse.json({ error: 'Sender settings are required' }, { status: 400 })
    const city = await db.city.findFirst({ where: { id: senderCityId, status: 'ACTIVE' }, select: { id: true } })
    if (!city) return NextResponse.json({ error: 'Sender city is invalid' }, { status: 400 })
    const existing = await db.shopifyInstallation.findUnique({ where: { clientId: user.clientId } })
    if (!existing) return NextResponse.json({ error: 'Connect Shopify before saving sender settings' }, { status: 404 })
    const updated = await db.shopifyInstallation.update({ where: { id: existing.id }, data: { senderName, senderPhone, senderAddress, senderCityId, status: existing.ordersWebhookId ? 'ACTIVE' : 'ERROR', lastError: existing.ordersWebhookId ? null : 'Shopify webhook is not registered' } })
    return NextResponse.json({ installation: responseFor(updated) })
  } catch {
    return NextResponse.json({ error: 'Sender settings could not be saved' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!canManage(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const clientId = user!.role === 'CLIENT' ? user!.clientId : String(body.clientId || '')
    if (!clientId) return NextResponse.json({ error: 'Client account is required' }, { status: 400 })

    const shopDomain = normalizeShopDomain(String(body.shopDomain || ''))
    const accessToken = String(body.accessToken || '').trim()
    const webhookSecret = String(body.webhookSecret || '').trim()
    const senderName = String(body.senderName || '').trim()
    const senderPhone = String(body.senderPhone || '').trim()
    const senderAddress = String(body.senderAddress || '').trim()
    const senderCityId = String(body.senderCityId || '').trim()
    if (!accessToken || webhookSecret.length < 16 || !senderName || !senderPhone || !senderAddress || !senderCityId) {
      return NextResponse.json({ error: 'Shopify credentials and sender settings are required' }, { status: 400 })
    }
    const city = await db.city.findFirst({ where: { id: senderCityId, status: 'ACTIVE' }, select: { id: true } })
    if (!city) return NextResponse.json({ error: 'Sender city is invalid' }, { status: 400 })

    const existing = await db.shopifyInstallation.findUnique({ where: { clientId } })
    if (existing && existing.shopDomain !== shopDomain && existing.ordersWebhookId) {
      await unregisterWebhook(existing, existing.ordersWebhookId).catch(() => undefined)
    }
    const installation = await db.shopifyInstallation.upsert({
      where: { clientId },
      create: {
        clientId,
        shopDomain,
        authMode: 'MANUAL',
        accessTokenEncrypted: encryptWebhookSecret(accessToken),
        webhookSecretEncrypted: encryptWebhookSecret(webhookSecret),
        senderName,
        senderPhone,
        senderAddress,
        senderCityId,
        status: 'ACTIVE',
      },
      update: {
        shopDomain,
        authMode: 'MANUAL',
        accessTokenEncrypted: encryptWebhookSecret(accessToken),
        refreshTokenEncrypted: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        grantedScopes: '',
        webhookSecretEncrypted: encryptWebhookSecret(webhookSecret),
        senderName,
        senderPhone,
        senderAddress,
        senderCityId,
        status: 'ACTIVE',
        lastError: null,
      },
    })

    let ordersWebhookId = existing?.ordersWebhookId || installation.ordersWebhookId
    if (!ordersWebhookId) {
      try {
        ordersWebhookId = await registerOrdersWebhook(installation)
        await db.shopifyInstallation.update({ where: { id: installation.id }, data: { ordersWebhookId } })
      } catch {
        await db.shopifyInstallation.update({ where: { id: installation.id }, data: { status: 'ERROR', lastError: 'Shopify webhook registration failed' } })
        return NextResponse.json({ error: 'Shopify credentials were saved but webhook registration failed' }, { status: 502 })
      }
    }

    const saved = await db.shopifyInstallation.findUniqueOrThrow({ where: { id: installation.id } })
    return NextResponse.json({ installation: responseFor(saved), webhookRegistered: Boolean(ordersWebhookId) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('myshopify.com')) return NextResponse.json({ error: message }, { status: 400 })
    return NextResponse.json({ error: 'Shopify connection failed' }, { status: 400 })
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CLIENT' || !user.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const installation = await db.shopifyInstallation.findUnique({ where: { clientId: user.clientId } })
    if (!installation) return NextResponse.json({ success: true })
    if (installation.ordersWebhookId) await unregisterWebhook(installation, installation.ordersWebhookId).catch(() => undefined)
    await db.shopifyInstallation.delete({ where: { id: installation.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Shopify disconnect failed' }, { status: 500 })
  }
}
