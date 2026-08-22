# Wslahali Partner API

The Partner API lets brands and merchants create, list, track, and bulk-manage shipments through a stable versioned interface. The current production base URL is `https://wsalhali.vercel.app/api/integrations/v1`. The legacy `https://wsalhali.vercel.app/api/public` route remains available temporarily and returns `X-Deprecated: Use /api/integrations/v1 instead`.

## Authentication and scopes

Send an API key in either of the following headers:

```http
Authorization: Bearer wsl_your_api_key
X-API-Key: wsl_your_api_key
```

New API keys have the form `wsl_` followed by 32 URL-safe random characters. Wslahali stores only a bcrypt hash and a short display prefix. The complete key is shown only once when it is created. Keys are client-scoped, and every Partner API query is restricted to the authenticated client.

The supported scopes are `shipments:read` and `shipments:write`. Read access covers cities, shipment listing, tracking, and status history. Write access covers single and bulk shipment creation. A missing key returns `401 UNAUTHORIZED`; a suspended or invalid key also returns `401`; a valid key without the required scope returns `403 INSUFFICIENT_SCOPE`.

## Response envelope and errors

Successful responses use `{ "data": ... }`. Errors use the following shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Shipment data is invalid",
    "details": {},
    "requestId": "request-id"
  }
}
```

The API uses `200` for reads, `201` for single shipment creation, `400` for invalid input, `401` for authentication failures, `403` for scope failures, `404` when a shipment is not owned by the authenticated client, `409` for idempotency conflicts, `429` for rate limits, and `500` for unexpected server errors. Stack traces and secrets are never returned to callers.

## Rate limits and idempotency

The default request limit is 100 requests per minute per API key, and the default shipment creation limit is 2,000 shipment creations per 24-hour window per API key. Configure these values with `RATE_LIMIT_PER_MINUTE` and `RATE_LIMIT_SHIPMENTS_PER_DAY`. If Upstash Redis is later added, the database-backed counters can be replaced by a distributed limiter.

For `POST /shipments` and `POST /shipments/bulk`, send a unique `Idempotency-Key` header. Wslahali stores the request hash, response status, and response body for 24 hours. Reusing the same key with the same request returns the original response; reusing it with a different request returns `409 IDEMPOTENCY_CONFLICT`.

## Cities

```http
GET /cities
```

Returns active cities only:

```json
{
  "data": [
    { "id": "city-id", "code": "CAI", "name": "Cairo", "governorate": "Cairo" }
  ]
}
```

Use `cityCode` when creating shipments. Internal city IDs are not a stable integration contract. The response also includes the governorate and the active tariff coverage is controlled by Wslahali; the merchant must not hardcode city names or prices.

## Get a shipping quote

```http
POST /quotes
Authorization: Bearer wsl_your_api_key
Content-Type: application/json
```

The quote request uses the same shipment fields as `POST /shipments`, but it does not create a shipment and does not need an `Idempotency-Key`. It requires `shipments:read` and returns the current net Wslahali price so the merchant can display it during checkout.

For Standard delivery, the current tariff is symmetric by route: Cairo/Giza local routes are 80 EGP; the governorates listed in the approved tariff image are 85 EGP; Upper Egypt is 100 EGP; New Valley and Hurghada are 110 EGP; and Sharm El Sheikh is 135 EGP. When two endpoints belong to different bands, the higher band applies. COD Fee is 0 EGP. The standard included weight is 0.5 kg and the configured additional-weight charge remains 8 EGP per kilogram increment.

```json
{
  "data": {
    "serviceType": "STANDARD",
    "weight": 0.5,
    "senderCityCode": "CAI",
    "recipientCityCode": "ALX",
    "shippingCost": 85,
    "codFee": 0,
    "totalCost": 85,
    "currency": "EGP"
  }
}
```

## Create a shipment

```http
POST /shipments
Content-Type: application/json
Idempotency-Key: 6bd36f7e-5c3f-42d9-9927-unique
```

```json
{
  "sender": {
    "name": "Brand Warehouse",
    "phone": "01000000000",
    "address": "Nasr City, Cairo",
    "cityCode": "CAI"
  },
  "recipient": {
    "name": "Ahmed Ali",
    "phone": "01111111111",
    "address": "Smouha, Alexandria",
    "cityCode": "ALX"
  },
  "serviceType": "STANDARD",
  "priority": "NORMAL",
  "weight": 1,
  "pieces": 1,
  "description": "Black T-shirt",
  "codAmount": 750
}
```

`shippingCost` is rejected if supplied. Wslahali calculates all charges server-side. Standard delivery follows the active net tariff described above and returns `codFee: 0`; the merchant must use the returned `totalCost` and must not calculate or add a COD percentage in its own code. Express and Same Day remain controlled by their separate active rules.

```json
{
  "data": {
    "id": "shipment-id",
    "trackingNumber": "WSL...",
    "status": "PENDING",
    "totalCost": 40,
    "createdAt": "2026-08-20T12:00:00.000Z"
  }
}
```

## List shipments

```http
GET /shipments?status=IN_TRANSIT&search=Ahmed&page=1&limit=50
```

The response is sorted by newest creation time and contains only shipments belonging to the authenticated client:

```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 50, "totalPages": 0 }
}
```

The maximum page size is 100. Search matches tracking number, recipient name, or recipient phone.

## Track one shipment

```http
GET /shipments/WSLABC123
```

A shipment owned by another client is indistinguishable from a missing shipment and returns `404 NOT_FOUND`. The response includes sender and recipient data, charges, payment state, current status, and ordered status history.

## Bulk operations

Create up to 100 shipments in one request:

```http
POST /shipments/bulk
Idempotency-Key: bulk-request-2026-08-20-001
Content-Type: application/json
```

The body may be an array or `{ "shipments": [] }`. Each row is validated independently and produces either a tracking number or a row-level error.

Track up to 100 tracking numbers:

```http
GET /shipments/bulk-track?trackingNumbers=WSL1,WSL2,WSL3
```

The bulk tracking response includes `found: false` for missing or foreign-client tracking numbers.

## Webhooks

Create webhook endpoints from the client dashboard or `POST /api/admin/webhooks` while authenticated with a dashboard session. The generated secret has the form `whsec_` followed by 32 URL-safe random characters and is shown only once. It is encrypted at rest for outbound signing and is never returned by list or update operations.

Supported events are:

`shipment.created`, `shipment.status_changed`, `shipment.picked_up`, `shipment.in_transit`, `shipment.out_for_delivery`, `shipment.delivered`, `shipment.failed`, `shipment.returned`, and `shipment.cancelled`.

Each delivery is signed using:

```text
HMAC-SHA256(timestamp + "." + rawBody, webhookSecret)
```

The headers are `X-Wslahali-Event`, `X-Wslahali-Delivery-ID`, `X-Wslahali-Timestamp`, and `X-Wslahali-Signature`. Verify the timestamp window before accepting the signature, then compute the HMAC over the exact raw request body.

### JavaScript verification example

```js
import crypto from 'node:crypto';

export function verifyWslahaliWebhook(rawBody, headers, secret) {
  const timestamp = headers.get('x-wslahali-timestamp');
  const signature = headers.get('x-wslahali-signature');
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

The first delivery is attempted immediately. A failed delivery is scheduled for a second attempt after one minute and a third attempt after five minutes. Every attempt is stored in `WebhookDelivery`. If no external worker is available, invoke the protected internal endpoint `POST /api/internal/webhooks/process` with `X-Webhook-Process-Secret`.

## cURL example

```bash
BASE_URL="https://wsalhali.vercel.app/api/integrations/v1"
API_KEY="wsl_replace_me"

curl "$BASE_URL/cities" -H "Authorization: Bearer $API_KEY"

curl -X POST "$BASE_URL/quotes" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "sender":{"name":"Warehouse","phone":"01000000000","address":"Nasr City","cityCode":"CAI"},
    "recipient":{"name":"Ahmed Ali","phone":"01111111111","address":"Smouha","cityCode":"ALX"},
    "serviceType":"STANDARD","weight":0.5,"codAmount":750
  }'

curl -X POST "$BASE_URL/shipments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-10001" \
  --data '{
    "sender":{"name":"Warehouse","phone":"01000000000","address":"Nasr City","cityCode":"CAI"},
    "recipient":{"name":"Ahmed Ali","phone":"01111111111","address":"Smouha","cityCode":"ALX"},
    "serviceType":"STANDARD","weight":1,"codAmount":750
  }'
```

## JavaScript client example

```js
const response = await fetch(`${baseUrl}/shipments`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify(shipment),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error?.message || 'Request failed');
```

## PHP client example

```php
$ch = curl_init($baseUrl . '/shipments');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Idempotency-Key: order-10001',
    ],
    CURLOPT_POSTFIELDS => json_encode($shipment, JSON_THROW_ON_ERROR),
    CURLOPT_RETURNTRANSFER => true,
]);
$payload = json_decode(curl_exec($ch), true, 512, JSON_THROW_ON_ERROR);
curl_close($ch);
```

## Python client example

```python
import requests

response = requests.post(
    f"{base_url}/shipments",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Idempotency-Key": "order-10001",
    },
    json=shipment,
    timeout=15,
)
response.raise_for_status()
created = response.json()["data"]
```

## Legacy compatibility

The legacy `GET /api/public` and `POST /api/public` routes remain available during migration. Legacy flat shipment fields such as `senderName`, `senderCityId`, `recipientName`, and `recipientCityId` are adapted to the versioned contract. Existing plaintext API keys are looked up once, converted to bcrypt hashes, assigned a display prefix, and cleared from the legacy plaintext column. New integrations should not use this route.

## Production checklist

Before deployment, apply the Partner API migration, configure `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_SESSION_SECRET`, `WEBHOOK_SECRET_ENCRYPTION_KEY`, `WEBHOOK_PROCESS_SECRET`, `WEBHOOK_TIMEOUT_MS`, `WEBHOOK_RETRY_ATTEMPTS`, `RATE_LIMIT_PER_MINUTE`, and `RATE_LIMIT_SHIPMENTS_PER_DAY`. Confirm that all webhook URLs use HTTPS, that secrets are stored only in Vercel Environment Variables or equivalent secret storage, and that the internal webhook processing endpoint is not called without its secret header. Run the integration script against a disposable test client and verify that a repeated idempotency key does not create a second shipment.
