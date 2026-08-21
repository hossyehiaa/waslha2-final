ALTER TABLE "ShopifyInstallation" ADD COLUMN IF NOT EXISTS "authMode" TEXT NOT NULL DEFAULT 'OAUTH';
ALTER TABLE "ShopifyInstallation" ADD COLUMN IF NOT EXISTS "refreshTokenEncrypted" TEXT;
ALTER TABLE "ShopifyInstallation" ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "ShopifyInstallation" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "ShopifyInstallation" ADD COLUMN IF NOT EXISTS "grantedScopes" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "ShopifyOAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopifyOAuthState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopifyOAuthState_stateHash_key" ON "ShopifyOAuthState"("stateHash");
CREATE INDEX IF NOT EXISTS "ShopifyOAuthState_expiresAt_idx" ON "ShopifyOAuthState"("expiresAt");
CREATE INDEX IF NOT EXISTS "ShopifyOAuthState_clientId_idx" ON "ShopifyOAuthState"("clientId");
ALTER TABLE "ShopifyOAuthState" ADD CONSTRAINT "ShopifyOAuthState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopifyOAuthState" ADD CONSTRAINT "ShopifyOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
