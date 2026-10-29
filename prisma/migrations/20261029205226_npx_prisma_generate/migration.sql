-- CreateTable
CREATE TABLE "TenantCredit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PAYMENT',
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantCredit_tenantId_idx" ON "TenantCredit"("tenantId");

-- CreateIndex
CREATE INDEX "TenantCredit_paymentId_idx" ON "TenantCredit"("paymentId");
