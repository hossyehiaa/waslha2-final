# Wslahali Shopify Integration

## Overview

Wslahali connects one Shopify store to one Wslahali client account through a standalone Shopify OAuth app. The merchant clicks **Connect Shopify** in the Wslahali client dashboard, approves the requested permissions in Shopify, and returns to Wslahali without copying an Admin API token or client secret.

After authorization, Wslahali stores the expiring offline access token and refresh token encrypted on the server, registers the shop-specific `orders/create` webhook, and asks the merchant only for default pickup settings. New Shopify orders are verified, deduplicated, and converted into Wslahali shipments. Shipment pricing is calculated on the Wslahali server; Shopify and browser requests cannot provide `shippingCost`.

When the Wslahali shipment moves through `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, or `DELIVERED`, the integration creates the corresponding Shopify fulfillment event. The first supported lifecycle event creates the Shopify fulfillment and attaches the Wslahali tracking number.

## One-time platform setup

The Wslahali operator creates one public Shopify app in the Shopify Dev Dashboard. Configure the production app URL and the exact OAuth callback URL:

`https://wsalhali.vercel.app/api/shopify/oauth/callback`

Store the app's client ID and client secret only in Vercel environment variables named `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`. Configure `SHOPIFY_SCOPES` with the minimum order and fulfillment scopes approved for the app, and keep `SHOPIFY_API_VERSION` on a supported stable version. The app must also have permission to create fulfillments and fulfillment events; Shopify may require the store's `fulfill_and_ship_orders` permission.

The production app URL must also be present as `NEXT_PUBLIC_APP_URL=https://wsalhali.vercel.app`. The app secret is never sent to the browser or included in a Shopify installation response.

## Merchant setup

The merchant opens **Dashboard → Shopify Integration**, enters the permanent `*.myshopify.com` domain, and clicks **Connect Shopify**. Wslahali generates a short-lived random state, binds its hash to the authenticated client and user, and redirects the merchant to Shopify. The callback validates the state, Shopify HMAC, strict shop-domain format, callback code, and granted scopes before exchanging the code for expiring offline access and refresh tokens.

After authorization, the merchant enters the default sender name, phone, address, and active Wslahali city, then clicks **Save pickup settings**. The installation becomes active only after the orders webhook has been registered and sender settings are valid. The browser never receives the access token or refresh token.

## OAuth security and token lifecycle

OAuth callback state is stored as a hash with a ten-minute expiry and is deleted after use. OAuth query HMAC is checked using a constant-time comparison and the shop domain is anchored to `^[a-z0-9][a-z0-9-]*\\.myshopify\\.com$`. Granted scopes are checked before token storage. Access tokens are refreshed server-side before expiry using the rotating refresh token; a refresh failure marks the installation for reauthorization without exposing provider errors or token values.

## Webhook security and processing

Shopify sends the raw JSON body with `X-Shopify-Hmac-SHA256`, `X-Shopify-Shop-Domain`, `X-Shopify-Topic`, and `X-Shopify-Webhook-Id` headers. OAuth installations are verified with the app client secret; legacy manual installations continue to use their encrypted per-installation secret. Wslahali verifies HMAC before parsing the payload and records each delivery ID per installation with a unique database constraint, so retries do not create duplicate shipments.

The webhook handler returns structured errors for invalid signatures, unknown stores, oversized bodies, and failed processing. Shopify can retry a failed processing response. The persistent `ShopifyWebhookEvent` record exposes the failure state without storing access tokens or refresh tokens.

## Order mapping

The webhook processor uses `shipping_address`, falling back to `billing_address` only when a shipping address is unavailable. The destination city must match an active Wslahali city by code or case-insensitive name. COD is inferred only for payment gateways whose names contain `cash`, `cod`, or `delivery`; prepaid orders receive a zero COD amount. Each Shopify order is mapped to one Wslahali shipment through `ShopifyOrder` with a unique `(installationId, shopifyOrderId)` constraint.

## Fulfillment permissions and statuses

The Shopify app must be allowed to read orders and fulfillment orders and to create fulfillments and fulfillment events. Wslahali does not mark a Shopify order as fulfilled until it has an open fulfillment order and can attach the Wslahali tracking number.

| Wslahali status | Shopify action |
| --- | --- |
| `PICKED_UP` | Create fulfillment if needed, then create `PICKED_UP` event |
| `IN_TRANSIT` | Create `IN_TRANSIT` event |
| `OUT_FOR_DELIVERY` | Create `OUT_FOR_DELIVERY` event |
| `DELIVERED` | Create `DELIVERED` event |
| `RETURNED`, `FAILED`, `CANCELLED` | Keep the Wslahali state; no unsupported fulfillment event is emitted |

## Operational requirements

The production deployment must define `NEXT_PUBLIC_APP_URL`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_API_VERSION`, and the existing Wslahali encryption secret. The Shopify receiver should remain fast and deterministic. Long-running reconciliation is intentionally separate from the synchronous webhook path; Shopify recommends reconciliation because webhook delivery is not guaranteed. A future reconciliation job can query updated orders and compare the `ShopifyOrder` mapping table.

## Security checklist

The app client secret and merchant tokens must never be placed in Git, browser local storage, frontend source, logs, database plaintext columns, or webhook payloads. The client dashboard can manage its own Shopify installation and sender settings but cannot access API Keys, Wslahali Webhooks, Integration Logs, or any other administrative feature. Disconnecting a store removes its Wslahali installation and unregisters the tracked webhook subscription.

## References

1. [Authenticate a standalone or API-only app](https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps)
2. [Authorization code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
3. [Shopify webhook delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
4. [Shopify webhook subscriptions](https://shopify.dev/docs/apps/build/webhooks/subscribe)
5. [Shopify Admin GraphQL `webhookSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate)
6. [Shopify Admin GraphQL `fulfillmentCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)
7. [Shopify Admin GraphQL `fulfillmentEventCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentEventCreate)
