-- AlterTable
ALTER TABLE "ComparisonSet" ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "ComparisonSet_shop_sessionId_idx" ON "ComparisonSet"("shop", "sessionId");
