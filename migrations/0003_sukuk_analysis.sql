-- CreateTable
CREATE TABLE "SukukAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "rating" TEXT,
    "score" REAL,
    "strategy" TEXT,
    "summary" TEXT,
    "metrics" TEXT,
    "data" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "SukukAnalysis_scope_createdAt_idx" ON "SukukAnalysis"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "SukukAnalysis_code_createdAt_idx" ON "SukukAnalysis"("code", "createdAt");

