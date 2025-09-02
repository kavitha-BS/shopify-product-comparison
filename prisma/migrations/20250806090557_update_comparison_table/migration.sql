-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompareList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "products" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CompareList" ("createdAt", "id", "products", "sessionId", "shop", "updatedAt") SELECT "createdAt", "id", "products", "sessionId", "shop", "updatedAt" FROM "CompareList";
DROP TABLE "CompareList";
ALTER TABLE "new_CompareList" RENAME TO "CompareList";
CREATE INDEX "CompareList_shop_customerId_idx" ON "CompareList"("shop", "customerId");
CREATE INDEX "CompareList_shop_sessionId_idx" ON "CompareList"("shop", "sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
