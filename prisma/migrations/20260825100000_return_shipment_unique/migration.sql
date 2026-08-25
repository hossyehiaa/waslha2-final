-- Enforce one Return record per shipment so auto-created returns stay idempotent
CREATE UNIQUE INDEX "Return_shipmentId_key" ON "Return"("shipmentId");
