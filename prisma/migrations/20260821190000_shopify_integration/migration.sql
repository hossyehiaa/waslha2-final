CREATE TABLE IF NOT EXISTS "ShopifyInstallation" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "webhookSecretEncrypted" TEXT NOT NULL,
  "ordersWebhookId" TEXT,
  "senderName" TEXT,
  "senderPhone" TEXT,
  "senderAddress" TEXT,
  "senderCityId" TEXT,
  "apiVersion" TEXT NOT NULL DEFAULT '2026-04',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopifyInstallation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyInstallation_clientId_key" ON "ShopifyInstallation"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyInstallation_shopDomain_key" ON "ShopifyInstallation"("shopDomain");
CREATE INDEX IF NOT EXISTS "ShopifyInstallation_status_idx" ON "ShopifyInstallation"("status");

CREATE TABLE IF NOT EXISTS "ShopifyOrder" (
  "id" TEXT NOT NULL,
  "installationId" TEXT NOT NULL,
  "shopifyOrderId" TEXT NOT NULL,
  "shopifyOrderName" TEXT,
  "shipmentId" TEXT,
  "fulfillmentOrderId" TEXT,
  "fulfillmentId" TEXT,
  "trackingNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopifyOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyOrder_shipmentId_key" ON "ShopifyOrder"("shipmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyOrder_installationId_shopifyOrderId_key" ON "ShopifyOrder"("installationId", "shopifyOrderId");
CREATE INDEX IF NOT EXISTS "ShopifyOrder_shopifyOrderId_idx" ON "ShopifyOrder"("shopifyOrderId");
CREATE INDEX IF NOT EXISTS "ShopifyOrder_trackingNumber_idx" ON "ShopifyOrder"("trackingNumber");

CREATE TABLE IF NOT EXISTS "ShopifyWebhookEvent" (
  "id" TEXT NOT NULL,
  "installationId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopifyWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyWebhookEvent_installationId_webhookId_key" ON "ShopifyWebhookEvent"("installationId", "webhookId");
CREATE INDEX IF NOT EXISTS "ShopifyWebhookEvent_status_idx" ON "ShopifyWebhookEvent"("status");
CREATE INDEX IF NOT EXISTS "ShopifyWebhookEvent_createdAt_idx" ON "ShopifyWebhookEvent"("createdAt");

ALTER TABLE "ShopifyInstallation" ADD CONSTRAINT "ShopifyInstallation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopifyOrder" ADD CONSTRAINT "ShopifyOrder_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "ShopifyInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopifyOrder" ADD CONSTRAINT "ShopifyOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopifyWebhookEvent" ADD CONSTRAINT "ShopifyWebhookEvent_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "ShopifyInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
