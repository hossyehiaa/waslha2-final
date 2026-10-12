-- Restore the published Upper Egypt shipping tariff to 105 EGP.
-- Scope the change to records explicitly tagged as Upper Egypt with the old 100 EGP default.
UPDATE "City"
SET "standardPrice" = 105
WHERE "pricingBand" = 'UPPER_EGYPT'
  AND "standardPrice" = 100;
