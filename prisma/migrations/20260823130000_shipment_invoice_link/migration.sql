-- Shipment <-> Invoice one-to-many: an invoice may contain many orders
ALTER TABLE "Shipment" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "Shipment_invoiceId_idx" ON "Shipment"("invoiceId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
