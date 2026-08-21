# Client Dashboard Security Audit — 2026-08-22

## Finding

The client dashboard was rendering the shared AI chatbot with administration-oriented copy and the AI endpoint queried global shipment, client, driver, branch, and COD totals. The client Profile also depended on a stale root auth context during account switching, which could display a previous user's profile until a full reload.

## Remediation

- The AI endpoint now derives the authenticated user from the server session.
- ADMIN and EMPLOYEE receive administration answers only.
- CLIENT requests require a valid `clientId` and query shipment and COD data using that `clientId`.
- Client requests do not call external LLM providers; this prevents client-scoped operational data from being sent outside Wslahali.
- Client chatbot copy and suggested questions are limited to the client's own shipments, COD balance, pickups, invoices, and tracking.
- The client layout now uses the shared AuthProvider and requires the CLIENT role.
- Login performs a full browser reload after authentication so a previous account's in-memory state cannot remain visible.
- Profile no longer exposes the internal role label for client accounts.
- Profile error responses no longer include internal exception details.
- Client dashboard pages now use explicit `/api/client/*` namespaces for cities, finance, insurance claims, loyalty, and pickups.
- `/api/client/dashboard` now accepts CLIENT sessions only and requires a server-derived `clientId`.
- No client dashboard page retains an `/api/admin/*` API reference.

## Verification

- Prisma schema validation passed.
- Next production build passed.
- TypeScript reported no errors in the changed security files; remaining project errors are in unrelated legacy files.
- Production unauthenticated checks returned expected responses:
  - `POST /api/ai-chat` → 401 JSON.
  - `GET /api/client/cities` → 401 JSON.
  - `GET /api/client/dashboard` → 401 JSON.
  - `GET /api/profile` → 405 because the route intentionally exposes PATCH and POST only.
  - `GET /dashboard/profile` → 200 page response.
- Changes are deployed from commit `fd089d4` on `main`.

A fully authenticated cross-account browser test still requires logging in as a real client account. After deployment, log out completely, log in again as the client, hard-refresh the browser, then verify Profile and Chatbot before giving the account to a customer.
