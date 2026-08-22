ALTER TABLE "WebhookDelivery"
  ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_processingStartedAt_idx"
  ON "WebhookDelivery"("processingStartedAt");
