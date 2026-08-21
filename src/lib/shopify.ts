import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { calculateShippingCost } from '@/lib/partner-api'
import { generateTrackingNumber } from '@/lib/auth-helpers'
import { decryptWebhookSecret, encryptWebhookSecret } from '@/lib/webhooks'

const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-04'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || ''
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || ''
const DEFAULT_SCOPES = 'read_orders,write_assigned_fulfillment_orders'

export { decryptWebhookSecret, encryptWebhookSecret }

export function normalizeShopDomain(value: string) {
  const raw = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/')[0]
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(raw)) {
    throw new Error('Shop domain must be a valid *.myshopify.com domain')
  }
  return raw
}

export function verifyShopifyHmac(rawBody: string, provided: string | null, secret: string) {
  if (!provided) return false
  const computed = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const providedBuffer = Buffer.from(provided, 'utf8')
  const computedBuffer = Buffer.from(computed, 'utf8')
  return providedBuffer.length === computedBuffer.length && crypto.timingSafeEqual(providedBuffer, computedBuffer)
}

export function generateShopifyOAuthState() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashShopifyOAuthState(state: string) {
  return crypto.createHash('sha256').update(state, 'utf8').digest('hex')
}

export function shopifyOAuthCallbackUrl() {
  if (!APP_URL || !APP_URL.startsWith('https://')) throw new Error('NEXT_PUBLIC_APP_URL must be configured with HTTPS')
  return `${APP_URL.replace(/\/$/, '')}/api/shopify/oauth/callback`
}

export function getShopifyAppClientSecret() {
  if (!SHOPIFY_CLIENT_SECRET) throw new Error('Shopify OAuth is not configured')
  return SHOPIFY_CLIENT_SECRET
}

function requiredScopes() {
  return (process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES).split(',').map((scope) => scope.trim()).filter(Boolean)
}

function callbackUrl() {
  if (!APP_URL || !APP_URL.startsWith('https://')) throw new Error('NEXT_PUBLIC_APP_URL must be configured with HTTPS')
  return `${APP_URL.replace(/\/$/, '')}/api/shopify/webhooks`
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export function verifyShopifyOAuthHmac(searchParams: URLSearchParams) {
  if (!SHOPIFY_CLIENT_SECRET) throw new Error('Shopify OAuth is not configured')
  const provided = searchParams.get('hmac')
  if (!provided) return false
  const message = Array.from(searchParams.entries())
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const computed = crypto.createHmac('sha256', SHOPIFY_CLIENT_SECRET).update(message, 'utf8').digest('hex')
  return constantTimeEqual(computed, provided)
}

export function createShopifyAuthorizationUrl(shopDomain: string, state: string) {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) throw new Error('Shopify OAuth is not configured')
  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`)
  url.searchParams.set('client_id', SHOPIFY_CLIENT_ID)
  url.searchParams.set('scope', requiredScopes().join(','))
  url.searchParams.set('redirect_uri', shopifyOAuthCallbackUrl())
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeShopifyCode(shopDomain: string, code: string) {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) throw new Error('Shopify OAuth is not configured')
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code, expiring: 1 }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number; scope?: string }
  if (!response.ok || !payload?.access_token || !payload.refresh_token || !payload.expires_in || !payload.refresh_token_expires_in) throw new Error('Shopify OAuth token exchange failed')
  const granted = (payload.scope || '').split(',').map((scope) => scope.trim()).filter(Boolean)
  const missing = requiredScopes().filter((scope) => !granted.includes(scope) && !(scope.startsWith('read_') && granted.includes(scope.replace(/^read_/, 'write_'))))
  if (missing.length) throw new Error('Shopify did not grant the required permissions')
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token, expiresAt: new Date(Date.now() + payload.expires_in * 1000), refreshTokenExpiresAt: new Date(Date.now() + payload.refresh_token_expires_in * 1000), grantedScopes: granted.join(',') }
}

async function refreshShopifyToken(installation: { id: string; shopDomain: string; refreshTokenEncrypted: string; apiVersion: string }) {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) throw new Error('Shopify OAuth is not configured')
  const response = await fetch(`https://${installation.shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: decryptWebhookSecret(installation.refreshTokenEncrypted) }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number }
  if (!response.ok || !payload?.access_token || !payload.refresh_token || !payload.expires_in || !payload.refresh_token_expires_in) throw new Error('Shopify token refresh failed')
  await db.shopifyInstallation.update({ where: { id: installation.id }, data: { accessTokenEncrypted: encryptWebhookSecret(payload.access_token), refreshTokenEncrypted: encryptWebhookSecret(payload.refresh_token), accessTokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000), refreshTokenExpiresAt: new Date(Date.now() + payload.refresh_token_expires_in * 1000), lastError: null } })
  return payload.access_token
}

async function accessToken(installation: { id?: string; accessTokenEncrypted: string; refreshTokenEncrypted?: string | null; accessTokenExpiresAt?: Date | null; shopDomain?: string; apiVersion?: string }) {
  if (installation.accessTokenExpiresAt && installation.refreshTokenEncrypted && installation.id && installation.shopDomain && installation.apiVersion && installation.accessTokenExpiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    return refreshShopifyToken({ id: installation.id, shopDomain: installation.shopDomain, refreshTokenEncrypted: installation.refreshTokenEncrypted, apiVersion: installation.apiVersion })
  }
  return decryptWebhookSecret(installation.accessTokenEncrypted)
}

async function shopifyGraphql<T>(installation: { id?: string; shopDomain: string; accessTokenEncrypted: string; refreshTokenEncrypted?: string | null; accessTokenExpiresAt?: Date | null; apiVersion: string }, query: string, variables: Record<string, unknown>) {
  const response = await fetch(`https://${installation.shopDomain}/admin/api/${installation.apiVersion || DEFAULT_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await accessToken(installation) },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null) as { data?: T; errors?: Array<{ message?: string }> }
  if (!response.ok || payload?.errors?.length || !payload?.data) throw new Error('Shopify API request failed')
  return payload.data
}

export async function registerOrdersWebhook(installation: { shopDomain: string; accessTokenEncrypted: string; apiVersion: string }) {
  const data = await shopifyGraphql<{ webhookSubscriptionCreate: { webhookSubscription: { id: string } | null; userErrors: Array<{ message: string }> } }>(installation, `
    mutation CreateOrdersWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id }
        userErrors { message }
      }
    }
  `, { topic: 'ORDERS_CREATE', webhookSubscription: { callbackUrl: callbackUrl(), format: 'JSON' } })
  const result = data.webhookSubscriptionCreate
  if (result.userErrors.length || !result.webhookSubscription?.id) throw new Error('Shopify webhook registration failed')
  return result.webhookSubscription.id
}

export async function unregisterWebhook(installation: { shopDomain: string; accessTokenEncrypted: string; apiVersion: string }, webhookId: string) {
  await shopifyGraphql<{ webhookSubscriptionDelete: { deletedWebhookSubscriptionId: string | null; userErrors: Array<{ message: string }> } }>(installation, `
    mutation DeleteWebhook($id: ID!) {
      webhookSubscriptionDelete(id: $id) { deletedWebhookSubscriptionId userErrors { message } }
    }
  `, { id: webhookId })
}

async function createFulfillment(installation: { shopDomain: string; accessTokenEncrypted: string; apiVersion: string }, orderId: string, trackingNumber: string) {
  const orderData = await shopifyGraphql<{ order: { fulfillmentOrders: { nodes: Array<{ id: string; status: string }> } } | null }>(installation, `
    query FulfillmentOrders($id: ID!) {
      order(id: $id) { fulfillmentOrders(first: 20) { nodes { id status } } }
    }
  `, { id: orderId })
  const fulfillmentOrder = orderData.order?.fulfillmentOrders.nodes.find((node) => node.status === 'OPEN' || node.status === 'IN_PROGRESS')
  if (!fulfillmentOrder) throw new Error('No open Shopify fulfillment order found')

  const data = await shopifyGraphql<{ fulfillmentCreate: { fulfillment: { id: string } | null; userErrors: Array<{ message: string }> } }>(installation, `
    mutation CreateFulfillment($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment { id }
        userErrors { message }
      }
    }
  `, {
    fulfillment: {
      notifyCustomer: true,
      lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: fulfillmentOrder.id }],
      trackingInfo: { number: trackingNumber, url: `${APP_URL.replace(/\/$/, '')}/track?tracking=${encodeURIComponent(trackingNumber)}`, company: 'Wslahali' },
    },
  })
  const result = data.fulfillmentCreate
  if (result.userErrors.length || !result.fulfillment?.id) throw new Error('Shopify fulfillment creation failed')
  return { fulfillmentOrderId: fulfillmentOrder.id, fulfillmentId: result.fulfillment.id }
}

const SHOPIFY_EVENT_STATUS: Record<string, string> = {
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
}

export async function syncShopifyShipmentStatus(shipmentId: string, status: string) {
  const mapping = await db.shopifyOrder.findUnique({ where: { shipmentId }, include: { installation: true, shipment: true } })
  if (!mapping?.shipment || !mapping.installation || mapping.installation.status !== 'ACTIVE') return

  let fulfillmentId = mapping.fulfillmentId
  let fulfillmentOrderId = mapping.fulfillmentOrderId
  if (!fulfillmentId && SHOPIFY_EVENT_STATUS[status]) {
    const fulfillment = await createFulfillment(mapping.installation, mapping.shopifyOrderId, mapping.trackingNumber || mapping.shipment.trackingNumber)
    fulfillmentId = fulfillment.fulfillmentId
    fulfillmentOrderId = fulfillment.fulfillmentOrderId
    await db.shopifyOrder.update({ where: { id: mapping.id }, data: { fulfillmentId, fulfillmentOrderId } })
  }
  const eventStatus = SHOPIFY_EVENT_STATUS[status]
  if (!fulfillmentId || !eventStatus) return

  const data = await shopifyGraphql<{ fulfillmentEventCreate: { fulfillmentEvent: { id: string } | null; userErrors: Array<{ message: string }> } }>(mapping.installation, `
    mutation CreateFulfillmentEvent($fulfillmentEvent: FulfillmentEventInput!) {
      fulfillmentEventCreate(fulfillmentEvent: $fulfillmentEvent) {
        fulfillmentEvent { id }
        userErrors { message }
      }
    }
  `, { fulfillmentEvent: { fulfillmentId, status: eventStatus, occurredAt: new Date().toISOString(), message: `Wslahali status: ${status}` } })
  if (data.fulfillmentEventCreate.userErrors.length || !data.fulfillmentEventCreate.fulfillmentEvent) throw new Error('Shopify fulfillment event failed')
  await db.shopifyInstallation.update({ where: { id: mapping.installation.id }, data: { lastSyncAt: new Date(), lastError: null } })
}

function getOrderId(payload: any) {
  if (payload.admin_graphql_api_id) return String(payload.admin_graphql_api_id)
  if (payload.id) return `gid://shopify/Order/${String(payload.id)}`
  return ''
}

function numeric(value: unknown) {
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 ? result : 0
}

export async function processShopifyOrderCreated(installationId: string, payload: any) {
  const installation = await db.shopifyInstallation.findUnique({ where: { id: installationId }, include: { client: { select: { userId: true } } } })
  if (!installation || installation.status !== 'ACTIVE') throw new Error('Shopify installation is not active')
  const orderId = getOrderId(payload)
  if (!orderId) throw new Error('Shopify order id is missing')
  const existing = await db.shopifyOrder.findUnique({ where: { installationId_shopifyOrderId: { installationId, shopifyOrderId: orderId } } })
  if (existing) return existing

  const destination = payload.shipping_address || payload.billing_address
  if (!destination?.address1 || !destination?.phone || !destination?.name) throw new Error('Shopify order is missing a deliverable address')
  if (!installation.senderName || !installation.senderPhone || !installation.senderAddress || !installation.senderCityId) throw new Error('Shopify sender settings are incomplete')
  const senderName = installation.senderName
  const senderPhone = installation.senderPhone
  const senderAddress = installation.senderAddress
  const senderCityId = installation.senderCityId

  const recipientCityName = String(destination.city || '').trim()
  const recipientCity = await db.city.findFirst({ where: { status: 'ACTIVE', OR: [{ code: recipientCityName.toUpperCase() }, { name: { equals: recipientCityName, mode: 'insensitive' } }] } })
  if (!recipientCity) throw new Error('Shopify destination city is not configured in Wslahali')
  const senderCity = await db.city.findFirst({ where: { id: senderCityId, status: 'ACTIVE' } })
  if (!senderCity) throw new Error('Shopify sender city is not configured in Wslahali')

  const serviceType = 'STANDARD' as const
  const priority = 'NORMAL' as const
  const weight = Math.max(0.1, numeric(payload.total_weight) || numeric(payload.line_items?.reduce((sum: number, item: any) => sum + numeric(item.grams) * numeric(item.quantity), 0)) / 1000 || 0.5)
  const pieces = Math.max(1, Math.round(numeric(payload.line_items?.reduce((sum: number, item: any) => sum + numeric(item.quantity), 0))))
  const paymentGateways = Array.isArray(payload.payment_gateway_names) ? payload.payment_gateway_names.join(' ') : ''
  const codAmount = /cash|cod|delivery/i.test(paymentGateways) ? numeric(payload.current_total_price || payload.total_price) : 0
  const quote = await calculateShippingCost({
    sender: { name: senderName, phone: senderPhone, address: senderAddress, cityCode: senderCity.code },
    recipient: { name: String(destination.name), phone: String(destination.phone), address: String(destination.address1), cityCode: recipientCity.code },
    serviceType,
    priority,
    weight,
    pieces,
    description: Array.isArray(payload.line_items) ? payload.line_items.map((item: any) => `${item.title || 'Item'} x${item.quantity || 1}`).join(', ').slice(0, 2000) : null,
    codAmount,
  }, senderCity.id, recipientCity.id)

  const trackingNumber = generateTrackingNumber()
  return db.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({ data: {
      trackingNumber,
      clientId: installation.clientId,
      createdById: installation.client.userId,
      senderName,
      senderPhone,
      senderAddress,
      senderCityId: senderCity.id,
      recipientName: String(destination.name),
      recipientPhone: String(destination.phone),
      recipientAddress: String(destination.address1),
      recipientCityId: recipientCity.id,
      type: 'DELIVERY',
      serviceType,
      priority,
      weight,
      pieces,
      description: Array.isArray(payload.line_items) ? payload.line_items.map((item: any) => `${item.title || 'Item'} x${item.quantity || 1}`).join(', ').slice(0, 2000) : null,
      shippingCost: quote.shippingCost,
      codAmount,
      codFee: quote.codFee,
      totalCost: quote.totalCost,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    } })
    await tx.shipmentStatus.create({ data: { shipmentId: shipment.id, status: 'PENDING', note: 'Shipment created from Shopify order', createdBy: installation.client.userId } })
    await tx.client.update({ where: { id: installation.clientId }, data: { totalShipments: { increment: 1 }, activeShipments: { increment: 1 } } })
    return tx.shopifyOrder.create({ data: { installationId, shopifyOrderId: orderId, shopifyOrderName: payload.name || null, shipmentId: shipment.id, trackingNumber } })
  })
}

export function webhookPayloadHash(rawBody: string) {
  return crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex')
}
