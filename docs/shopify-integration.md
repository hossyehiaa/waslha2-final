# Wslahali Shopify Integration

## Overview

Wslahali connects one Shopify store to one Wslahali client account. A new Shopify order is delivered to the HTTPS webhook endpoint `/api/shopify/webhooks`, verified with the raw-body HMAC signature, deduplicated by `X-Shopify-Webhook-Id`, and converted into a Wslahali shipment using the merchant's configured sender address. Shipment pricing is calculated on the Wslahali server; Shopify and browser requests cannot provide `shippingCost`.

When the Wslahali shipment moves through `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, or `DELIVERED`, the integration creates the corresponding Shopify fulfillment event. The first supported lifecycle event creates the Shopify fulfillment and attaches the Wslahali tracking number.

## Merchant setup

The merchant should create a Shopify app using Shopify's current Dev Dashboard or Shopify CLI flow. Shopify no longer permits creating new admin-created custom apps; existing legacy custom apps continue to work. The merchant must grant the minimum order and fulfillment scopes required by the store's Shopify plan, generate the Admin API access token, and copy the app client secret for webhook HMAC verification.

From the Wslahali client dashboard, open **Shopify Integration** and enter the permanent `*.myshopify.com` domain, the Admin API access token, the Shopify app client secret, and the default sender details. Wslahali validates the sender city, encrypts both credentials with AES-256-GCM, stores only the encrypted values, and registers the `orders/create` subscription through Shopify's Admin GraphQL API. The full token and secret are cleared from the browser after a successful save and are never included in API responses.

## Webhook security and processing

Shopify sends the raw JSON body with `X-Shopify-Hmac-SHA256`, `X-Shopify-Shop-Domain`, `X-Shopify-Topic`, and `X-Shopify-Webhook-Id` headers. Wslahali verifies HMAC-SHA256 with a constant-time comparison before parsing the body. It records each delivery ID per installation with a unique database constraint, so retries do not create duplicate shipments.

The webhook handler returns a structured error for invalid signatures, unknown stores, oversized bodies, and failed processing. Shopify should retry a failed processing response. The persistent `ShopifyWebhookEvent` record exposes the failure state to future operational tooling without storing the access token or secret.

## Order mapping

The webhook processor uses `shipping_address`, falling back to `billing_address` only when a shipping address is unavailable. The destination city must match an active Wslahali city by code or case-insensitive name. COD is inferred only for payment gateways whose names contain `cash`, `cod`, or `delivery`; prepaid orders receive a zero COD amount. Each Shopify order is mapped to one Wslahali shipment through `ShopifyOrder` with a unique `(installationId, shopifyOrderId)` constraint.

## Fulfillment permissions and statuses

The merchant's Shopify app must be allowed to read fulfillment orders and create fulfillments and fulfillment events. Shopify may require the store's `fulfill_and_ship_orders` permission in addition to the relevant Admin API access scopes. Wslahali does not mark a Shopify order as fulfilled until it has an open fulfillment order and can attach the Wslahali tracking number.

| Wslahali status | Shopify action |
| --- | --- |
| `PICKED_UP` | Create fulfillment if needed, then create `PICKED_UP` event |
| `IN_TRANSIT` | Create `IN_TRANSIT` event |
| `OUT_FOR_DELIVERY` | Create `OUT_FOR_DELIVERY` event |
| `DELIVERED` | Create `DELIVERED` event |
| `RETURNED`, `FAILED`, `CANCELLED` | Keep the Wslahali state; no unsupported fulfillment event is emitted |

## Operational requirements

The production deployment must define `NEXT_PUBLIC_APP_URL` as the HTTPS Wslahali domain and must retain `WEBHOOK_SECRET_ENCRYPTION_KEY` or `ADMIN_SESSION_SECRET`. The Shopify receiver should remain fast and deterministic. Long-running reconciliation is intentionally separate from the synchronous webhook path; Shopify recommends reconciliation because webhook delivery is not guaranteed. A future reconciliation job can query updated orders and compare the `ShopifyOrder` mapping table.

## Security checklist

Credentials must be entered only through the authenticated client dashboard or a protected server-side administrative workflow. They must never be placed in Git, browser local storage, frontend source, logs, database plaintext columns, or webhook payloads. The client dashboard can manage its own Shopify installation but cannot access API Keys, Wslahali Webhooks, Integration Logs, or any other administrative feature.

## References

1. [Shopify webhooks overview](https://shopify.dev/docs/apps/build/webhooks)
2. [Shopify webhook delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
3. [Shopify Admin GraphQL `webhookSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate)
4. [Shopify Admin GraphQL `fulfillmentCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)
5. [Shopify Admin GraphQL `fulfillmentEventCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentEventCreate)
6. [Shopify access tokens for admin-created custom apps](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)
