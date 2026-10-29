
-- Ajouter le jour d'exigibilité du loyer
ALTER TABLE "Lease"
ADD COLUMN "dueDayOfMonth" INTEGER NOT NULL DEFAULT 1;

-- Ajouter tenantId temporairement nullable
ALTER TABLE "Payment"
ADD COLUMN "tenantId" TEXT;

-- Associer les paiements existants à leur locataire
UPDATE "Payment" AS p
SET "tenantId" = (
    SELECT l."tenantId"
    FROM "PaymentAllocation" AS pa
    JOIN "RentCharge" AS rc
      ON rc."id" = pa."rentChargeId"
    JOIN "Lease" AS l
      ON l."id" = rc."leaseId"
    WHERE pa."paymentId" = p."id"
    LIMIT 1
);

-- Interrompre la migration si un paiement reste sans locataire
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Payment"
        WHERE "tenantId" IS NULL
    ) THEN
        RAISE EXCEPTION
          'Migration interrompue : un paiement reste sans locataire. Associez-le manuellement avant de relancer.';
    END IF;
END $$;

-- Rendre tenantId obligatoire
ALTER TABLE "Payment"
ALTER COLUMN "tenantId" SET NOT NULL;

-- Créer l'index des paiements par locataire et date
CREATE INDEX "Payment_tenantId_paymentDate_idx"
ON "Payment"("tenantId", "paymentDate");

-- Ajouter la relation avec Tenant
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_tenantId_fkey"
FOREIGN KEY ("tenantId")
REFERENCES "Tenant"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
