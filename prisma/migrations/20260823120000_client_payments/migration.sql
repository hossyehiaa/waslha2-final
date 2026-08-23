-- ClientPayments (سداد العملاء): bulk invoice payment records with screenshot proof
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "note" TEXT,
    "proofUrl" TEXT,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "invoiceIds" TEXT NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_reference_key" ON "ClientPayment"("reference");

-- CreateIndex
CREATE INDEX "ClientPayment_clientId_idx" ON "ClientPayment"("clientId");

-- CreateIndex
CREATE INDEX "ClientPayment_createdAt_idx" ON "ClientPayment"("createdAt");

-- AddForeignKey
ALTER TABLE "ClientPayment" ADD CONSTRAINT "ClientPayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invoice: link to the payment that settled it
ALTER TABLE "Invoice" ADD COLUMN "paymentId" TEXT;
