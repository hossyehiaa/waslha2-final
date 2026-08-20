-- Partner API security and delivery infrastructure
ALTER TABLE "ApiKey" ALTER COLUMN "key" DROP NOT NULL;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyHash" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "isTestMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_key_idx" ON "ApiKey"("key");

CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_clientId_endpoint_key" ON "IdempotencyKey"("key", "clientId", "endpoint");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_key_idx" ON "IdempotencyKey"("key");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_clientId_idx" ON "IdempotencyKey"("clientId");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "secretEncrypted" TEXT,
  "secretPrefix" TEXT NOT NULL,
  "name" TEXT,
  "events" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_clientId_idx" ON "WebhookEndpoint"("clientId");
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "secretEncrypted" TEXT;
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_isActive_idx" ON "WebhookEndpoint"("isActive");

CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "webhookEndpointId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_nextAttemptAt_idx" ON "WebhookDelivery"("nextAttemptAt");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookEndpointId_idx" ON "WebhookDelivery"("webhookEndpointId");

CREATE TABLE IF NOT EXISTS "ApiRequestLog" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "apiKeyId" TEXT,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "query" TEXT,
  "statusCode" INTEGER NOT NULL,
  "errorMessage" TEXT,
  "requestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_clientId_idx" ON "ApiRequestLog"("clientId");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_apiKeyId_idx" ON "ApiRequestLog"("apiKeyId");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");

ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Shipment_createdAt_idx" ON "Shipment"("createdAt");
