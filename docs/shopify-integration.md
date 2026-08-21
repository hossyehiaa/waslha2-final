# Wslahali Shopify Integration — Manual Setup

## What this integration does

The merchant keeps using Shopify as the storefront and order system. Wslahali connects to that store through a Shopify app created for the merchant's store. After the merchant enters the store domain, Admin API access token, app client secret, and pickup settings in **Dashboard → Shopify Integration**, Wslahali registers an `orders/create` webhook and turns new Shopify orders into Wslahali shipments.

Wslahali calculates shipping price on the server. Shopify and browser requests cannot provide `shippingCost`. Shipment statuses are synchronized to Shopify fulfillment events for `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, and `DELIVERED`.

## What the Wslahali operator does

Create the merchant's client account, configure the merchant's allowed service cities and pricing rules, then create a dedicated Partner API key only if the merchant also needs a separate API integration. For this Shopify connection, the merchant uses the Shopify Integration page rather than the Partner API key.

Before activating the connection, confirm that the merchant has a valid pickup name, phone, address, and active Wslahali city. Run one test order after the connection and confirm that the order appears as a shipment with a tracking number.

## What the Shopify merchant does

The merchant signs in to the Shopify Admin for the store, creates or opens a Shopify app for that store, and grants the minimum permissions required to read orders and fulfillment orders and create fulfillments and fulfillment events. Shopify may require the store's `fulfill_and_ship_orders` permission in addition to the relevant Admin API scopes.[1]

The merchant then copies the following values into **Dashboard → Shopify Integration**:

| Value | Purpose |
| --- | --- |
| Permanent `*.myshopify.com` domain | Identifies the Shopify store; the custom storefront domain is not used |
| Admin API Access Token | Allows Wslahali to query orders and update fulfillment tracking |
| Shopify App Client Secret | Allows Wslahali to verify the HMAC signature on webhook deliveries |
| Sender name, phone, address, and city | Provides the pickup origin for created Wslahali shipments |

The merchant must not send these secrets through WhatsApp, email, support chat, Git, or frontend code. They should be entered only in the authenticated Wslahali dashboard. Wslahali encrypts the token and client secret with AES-256-GCM and never returns them in API responses.

## Connection sequence

1. The merchant enters the store domain and Shopify credentials in the authenticated Wslahali client dashboard.
2. Wslahali validates the domain and sender city, encrypts the credentials, and registers the `orders/create` subscription through the Shopify Admin GraphQL API.
3. Shopify sends each new order to `https://wsalhali.vercel.app/api/shopify/webhooks`.
4. Wslahali verifies the raw-body `X-Shopify-Hmac-SHA256` signature before parsing the payload, deduplicates the delivery by `X-Shopify-Webhook-Id`, and maps the order's shipping address to an active Wslahali city.
5. Wslahali creates one shipment per Shopify order, calculates the shipping price server-side, and stores the mapping with a unique installation/order constraint.
6. When the shipment status changes, Wslahali creates the corresponding Shopify fulfillment event and attaches the Wslahali tracking number.

## Supported status mapping

| Wslahali status | Shopify action |
| --- | --- |
| `PICKED_UP` | Create fulfillment if needed, then create `PICKED_UP` event |
| `IN_TRANSIT` | Create `IN_TRANSIT` event |
| `OUT_FOR_DELIVERY` | Create `OUT_FOR_DELIVERY` event |
| `DELIVERED` | Create `DELIVERED` event |
| `RETURNED`, `FAILED`, `CANCELLED` | Keep the Wslahali state; no unsupported event is emitted |

## Security and tenant isolation

Each Shopify installation belongs to exactly one Wslahali client. Client users can manage only their own Shopify installation and pickup settings. API Keys, Wslahali Webhooks, Integration Logs, pricing administration, and other administrative features remain unavailable to client users.

The webhook receiver rejects unknown stores, inactive installations, missing headers, oversized payloads, invalid HMAC signatures, and duplicate delivery IDs. Access tokens, client secrets, and raw credentials are not written to logs or returned to browsers. If a token is rotated, the merchant should update it through the dashboard; if access is revoked in Shopify, the Wslahali installation must be reconnected with a new token.

## Customer message template

> لربط متجرك Shopify مع Wslahali، افتح Shopify Admin الخاص بمتجرك وأنشئ Shopify App أو افتح التطبيق الموجود لديك. فعّل الصلاحيات المطلوبة لقراءة الطلبات وطلبات التنفيذ وإنشاء التتبع والـ fulfillment.
>
> بعد ذلك ادخل إلى حسابك في Wslahali وافتح **Dashboard → Shopify Integration**، ثم أدخل:
>
> - رابط المتجر بصيغة `your-store.myshopify.com`
> - Admin API Access Token
> - Shopify App Client Secret
> - اسم ورقم هاتف وعنوان ومكان استلام الشحنات
>
> اضغط **Save and connect**. بعد نجاح الحفظ، أي طلب جديد في Shopify سيتم تحويله تلقائياً إلى شحنة في Wslahali، وسيتم تحديث رقم التتبع وحالة الشحنة في Shopify.
>
> لا ترسل Access Token أو Client Secret في WhatsApp أو البريد، ولا تضعهما في كود الموقع. أدخلهما فقط داخل صفحة Shopify Integration في Wslahali.

## References

1. [Shopify webhook subscriptions and custom apps](https://shopify.dev/docs/apps/build/webhooks/subscribe)
2. [Shopify webhook delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
3. [Shopify Admin GraphQL `webhookSubscriptionCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/webhookSubscriptionCreate)
4. [Shopify Admin GraphQL `fulfillmentCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)
5. [Shopify Admin GraphQL `fulfillmentEventCreate`](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentEventCreate)
