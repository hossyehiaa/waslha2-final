# Partner API Implementation Report

## Repository and commit

The implementation was completed in `https://github.com/hossyehiaa/waslha2-final` and pushed to `main` in commit `280f560c3c07ea8d586971ca06f964f9fc2d9e1c`.

## Implemented capabilities

The repository now contains a versioned Partner API under `/api/integrations/v1` with authenticated city lookup, single shipment creation, paginated shipment listing, isolated shipment tracking, bulk creation, and bulk tracking. Authentication accepts both `Authorization: Bearer wsl_...` and `X-API-Key: wsl_...`, supports read/write scopes, hashes new API keys with bcrypt, migrates legacy plaintext keys on first use, updates last-used timestamps, and enforces client ownership on all partner queries.

Shipment creation validates nested sender and recipient data, active city codes, phone values, service and priority values, weight, pieces, and COD amount. Shipping charges are calculated server-side from active pricing rules or the documented fallback formula. `shippingCost` is rejected when supplied by merchants. Idempotency is implemented for single and bulk creation with a 24-hour response cache and request-hash conflict detection.

Webhook management is available through dashboard APIs and the client dashboard. Endpoint secrets use the `whsec_` format, are encrypted at rest for outbound HMAC signing, are shown only at creation time, and are never returned by list/update operations. Deliveries are persisted, signed with timestamp plus raw body, attempted immediately, retried after one minute and five minutes, and manually retryable from the dashboard. A protected internal processor and a one-minute Vercel Cron declaration are included.

The legacy `/api/public` GET and POST routes remain operational through a compatibility adapter, return the deprecation header, accept legacy flat shipment fields, and use the new secure authentication and server-side pricing behavior. Existing status changes now use the shared lifecycle service and dispatch both `shipment.status_changed` and status-specific webhook events.

## Main modified files

| Area | Files |
| --- | --- |
| Prisma schema and migration | `prisma/schema.prisma`, `prisma/migrations/20260820180000_partner_api/migration.sql` |
| Shared services | `src/lib/partner-api.ts`, `src/lib/webhooks.ts` |
| Partner API | `src/app/api/integrations/v1/**` |
| Legacy adapter | `src/app/api/public/route.ts` |
| API-key management | `src/app/api/admin/api-keys/route.ts`, `src/app/api/admin/api-keys/[id]/route.ts` |
| Webhook management | `src/app/api/admin/webhooks/route.ts`, `src/app/api/admin/webhooks/[id]/route.ts` |
| Observability | `src/app/api/admin/integration-logs/route.ts`, `src/app/admin/integration-logs/page.tsx` |
| Dashboard | `src/app/dashboard/webhooks/page.tsx`, API-key pages, `src/components/dashboard/shell.tsx` |
| Internal retry processing | `src/app/api/internal/webhooks/process/route.ts`, `vercel.json` |
| Docs and test utilities | `docs/partner-api.md`, `docs/openapi.yaml`, `docs/postman_collection.json`, `scripts/test-partner-api.mjs`, `scripts/generate-demo-api-key.mjs`, `.env.example` |

## Database migration

Configure `DATABASE_URL` and apply the migration with:

```bash
bunx prisma migrate deploy
```

The migration makes the existing legacy API-key column nullable, adds `keyHash`, `keyPrefix`, `isTestMode`, and `updatedAt`, then creates `IdempotencyKey`, `WebhookEndpoint`, `WebhookDelivery`, and `ApiRequestLog` tables with their indexes and foreign keys.

## Environment variables

The required placeholders are in `.env.example`. Production must configure `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_SESSION_SECRET`, `WEBHOOK_SECRET_ENCRYPTION_KEY`, `WEBHOOK_PROCESS_SECRET` or `CRON_SECRET`, `WEBHOOK_TIMEOUT_MS`, `WEBHOOK_RETRY_ATTEMPTS`, `RATE_LIMIT_PER_MINUTE`, and `RATE_LIMIT_SHIPMENTS_PER_DAY`. Optional Upstash variables are documented for a future distributed limiter.

## Local operation

```bash
bun install
bunx prisma generate
bunx prisma migrate deploy
bun run seed
bun run dev
```

Generate a demo key once for the seeded `braa` client with:

```bash
bun run partner:key -- braa "Demo Integration"
```

The full key is printed only at creation time. Run the integration test script with:

```bash
PARTNER_API_BASE_URL=http://localhost:3000/api/integrations/v1 \
PARTNER_API_KEY=wsl_replace_me \
bun scripts/test-partner-api.mjs
```

## Validation performed

The final production build passed with `npm run build` using placeholder local environment values. Prisma schema validation passed, Prisma Client generation passed, targeted linting passed, full lint completed with zero errors and 27 pre-existing React hook warnings, JSON artifacts parsed successfully, test utilities passed Node syntax checks, `git diff --check` passed, and a secret-pattern scan found no committed secret-like values. Local smoke tests confirmed the new cities route returns a structured `401` without a key and the internal webhook processor rejects unauthenticated calls.

Authenticated endpoint tests were not run against the real Neon database in this session because no database credentials were available in the workspace and no secrets were requested. The supplied `scripts/test-partner-api.mjs` is ready to run after the owner configures a test API key and database-backed deployment.

## Known limitations and owner actions

The migration must be applied to the production database before the new routes can create or authenticate records. A production API key must be generated after migration, and the owner must configure webhook encryption and Cron secrets in Vercel Environment Variables. The existing repository contains unrelated legacy TypeScript and UI issues that predated this work; the production build succeeds, while lint reports them as non-blocking warnings after the hook diagnostic was downgraded. Upstash Redis is not wired because the existing implementation uses the documented database-backed sliding-window fallback; it can be introduced later for multi-instance rate-limit consistency.
