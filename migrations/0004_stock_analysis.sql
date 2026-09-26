-- CreateTable
CREATE TABLE "StockAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "rating" TEXT,
    "score" REAL,
    "recommendation" TEXT,
    "targetView" TEXT,
    "summary" TEXT,
    "metrics" TEXT,
    "data" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "StockAnalysis_symbol_createdAt_idx" ON "StockAnalysis"("symbol", "createdAt");

