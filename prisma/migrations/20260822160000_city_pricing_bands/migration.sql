-- Add explicit city pricing bands for the production tariff resolver.
ALTER TABLE "City" ADD COLUMN "pricingBand" TEXT DEFAULT 'UNPRICED';
ALTER TABLE "City" ADD COLUMN "standardPrice" DOUBLE PRECISION;
