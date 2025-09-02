-- AlterTable
ALTER TABLE "ComparisonSet" ADD COLUMN "customerId" TEXT;

-- CreateIndex
CREATE INDEX "ComparisonSet_shop_customerId_idx" ON "ComparisonSet"("shop", "customerId");

-- CreateIndex
CREATE INDEX "ComparisonSet_shop_customerId_sessionId_idx" ON "ComparisonSet"("shop", "customerId", "sessionId");
