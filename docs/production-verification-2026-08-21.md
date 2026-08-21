# Production verification — 2026-08-21

- Production home page `https://wsalhali.vercel.app/` responded successfully after deployment verification.
- `GET https://wsalhali.vercel.app/api/integrations/v1/cities` without credentials returned structured JSON with `error.code = UNAUTHORIZED`, message `A valid API key is required`, and a request ID.


The production Neon database accepted migration `20260821190000_shopify_integration`. A subsequent `prisma migrate status` reported: `Database schema is up to date!`.


Final HTTP checks against `https://wsalhali.vercel.app` confirmed that the legacy `GET /api/public` returns HTTP 401 JSON with `X-Deprecated: Use /api/integrations/v1 instead`; `POST /api/internal/webhooks/process` without the cron secret returns HTTP 401; `GET /api/client/invoices` without a session returns HTTP 401; and `GET /api/shopify/webhooks` is guarded with HTTP 405 because the receiver accepts POST only.
