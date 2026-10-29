/*
  Warnings:

  - A unique constraint covering the columns `[propertyId,reference]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "propertyId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'APARTMENT',
ALTER COLUMN "buildingId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Unit_propertyId_idx" ON "Unit"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_propertyId_reference_key" ON "Unit"("propertyId", "reference");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
