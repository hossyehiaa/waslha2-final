# Wslahali Production Readiness Report

**Date:** 22 August 2026  
**Audited repository:** `hossyehiaa/waslha2-final`  
**Production domain:** `https://wsalhali.vercel.app`  
**Latest audited commit:** `263860b`

## Executive decision

> **Decision: NO-GO for unrestricted market launch.**

The application is now operationally deployed, the Shopify database blocker is resolved, and the principal client-tenant isolation work is in place. Nevertheless, it is not yet responsible to describe the system as fully production-ready for many paying merchants. Three release gates remain: a real end-to-end Shopify test, a clean TypeScript release gate, and a reliable webhook retry worker. The current system may be shared with a **controlled pilot** after those risks are explicitly accepted, but not marketed as a fully validated Bosta-level production platform.

## What was verified

| Area | Result | Evidence or scope |
|---|---|---|
| Production deployment | PASS | Vercel deployment for commit `263860b` is `READY` and production-targeted. |
| Production database migrations | PASS | Vercel build logs show five migrations and `No pending migrations to apply`; the actual Neon database used by Vercel was identified and synchronized. |
| Shopify page loading | PASS | The previous `P2021` missing-table failure was resolved; the client confirmed the error disappeared. |
| Unauthenticated API protection | PASS | Shopify installation, client cities, Partner cities, and internal webhook processor reject unauthenticated requests with structured JSON `401` responses. |
| Legacy public API warning | PASS | `/api/public` returns the expected `X-Deprecated: Use /api/integrations/v1 instead` header. |
| Client navigation isolation | PASS | Client navigation excludes API Keys, Webhooks, admin settings, audit logs, and other administrative controls. Legacy client API-key and webhook pages redirect to the client dashboard. |
| Client chatbot separation | PASS in code review | Client requests derive scope from the server session and client ID; client chatbot responses do not call an external LLM provider. |
| Profile/session sanitization | PASS in code review | `auth/me` returns the sanitized current user object without password hashes, session tokens, or admin records. |
| Partner API tenant scoping | PASS in code review | Authenticated Partner API shipment queries use the API key's client ID; tracking lookup also includes client ID. |
| Server-side pricing | PASS in code review | Partner and client shipment creation calculate pricing on the server and reject or ignore client-controlled pricing fields. |
| Idempotency | PASS in code review | Partner shipment creation stores request hash and response for replay and detects conflicting reuse. A real authenticated production run remains desirable. |
| Login hardening | PASS for implemented control | Password verification uses bcrypt; failed login throttling is now database-backed with a 15-minute window and ten-failure IP threshold. |
| Shipment integrity hardening | PASS for implemented controls | Client city IDs are resolved against active cities, client assignment fields are restricted, creation is transactional, and concurrent duplicate status changes are rejected atomically. |
| Secret encryption boundary | PASS for implemented control | Shopify/webhook secrets use AES-GCM and now require the dedicated `WEBHOOK_SECRET_ENCRYPTION_KEY`; they no longer fall back to the session secret. |

## Release blockers

### 1. Shopify has not completed a real end-to-end test

The manual Custom App architecture is implemented, but no real merchant token and app secret were used during this audit. Before accepting live merchants, connect a disposable Shopify development/test store and verify the complete sequence: credential validation, webhook registration, one `orders/create` delivery, exactly one shipment creation, duplicate webhook delivery handling, invalid-HMAC rejection, destination-city mapping, COD calculation, and fulfillment/status synchronization.

### 2. Webhook retries are not real-time on the current Vercel Hobby plan

The application performs an immediate delivery attempt and stores failed deliveries for retry. A protected daily Vercel cron was added as a fallback, but Vercel documents that Hobby cron jobs are limited to once per day and may run at any point within the selected hour.[1] This is not equivalent to the intended one-minute/five-minute retry behavior. For a courier business, use an external scheduler/worker with frequent execution or move to a hosting plan and architecture that supports the required cadence. Also add a concurrency lock before processing retries at scale, because duplicate cron invocations can occur.[1]

### 3. The repository does not pass a clean TypeScript gate

The full `tsc --noEmit` check still reports **28 errors**, mainly in legacy admin, driver, example, and translation-typing code. The Next.js configuration currently sets `typescript.ignoreBuildErrors: true`, so Vercel can deploy despite those errors. The changed security and Shopify files have no TypeScript errors in the scoped check, but a high-security production SaaS should remove the global ignore setting and make the full type check pass before broad launch.

### 4. Authenticated production integration tests are incomplete

The Partner API test script passed its unauthenticated checks, but the full authenticated suite was not run because no production API key was used in this audit. A disposable test client/API key should be used once to verify create, idempotency replay, server pricing, list, tracking, bulk behavior, and legacy deprecation behavior in production. Do not use a real customer's API key for this test.

## Important non-blocking product risks

The login page still presents a Forgot Password control that does not implement password recovery, and the Remember Me checkbox is not connected to a different session policy. These are not confirmed tenant-isolation vulnerabilities, but they should be fixed or clearly disabled before public marketing.

Lint exits successfully but reports approximately 29 React hook warnings. These are primarily code-quality warnings rather than confirmed security failures, but they should be reduced as part of the release hardening cycle.

The audit found that Vercel build migrations can contend on Prisma's advisory lock; the build now retries migration deployment four times. This is a mitigation, not a replacement for keeping schema migrations separately observable and avoiding concurrent production deployments when possible.

## Recommended launch sequence

First, keep the current system private or pilot-only. Next, complete the disposable Shopify test and authenticated Partner API test. Then remove `typescript.ignoreBuildErrors`, repair all type errors, and make type-check failure block deployment. After that, deploy a reliable frequent webhook retry worker with idempotent processing and a concurrency lock. Finally, rotate all temporary credentials previously used during setup, confirm production secrets are stored only in Vercel Environment Variables, and run a two-account isolation test with two separate client users before opening merchant onboarding.

## Final assessment

The application is **much safer and more complete than before**, and the immediate Shopify loading failure is fixed. It is suitable for continued controlled testing and a limited pilot once the owner accepts the remaining operational risks. It is **not yet verified enough to claim full production readiness or unrestricted market launch**.

## References

[1]: https://vercel.com/docs/cron-jobs/manage-cron-jobs "Vercel — Managing Cron Jobs"
