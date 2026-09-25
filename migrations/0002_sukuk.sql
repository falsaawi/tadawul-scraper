-- CreateTable
CREATE TABLE "SukukInstrument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "isin" TEXT,
    "couponType" TEXT,
    "couponRate" REAL,
    "maturityDate" TEXT,
    "parValue" REAL,
    "issuanceAmount" REAL,
    "currency" TEXT,
    "couponFrequency" TEXT,
    "dayCount" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SukukQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instrumentYield" REAL,
    "bidYield" REAL,
    "askYield" REAL,
    "lastPrice" REAL,
    "bidPrice" REAL,
    "askPrice" REAL
);

-- CreateTable
CREATE TABLE "SukukHistoricalPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "open" REAL,
    "high" REAL,
    "low" REAL,
    "close" REAL,
    "change" REAL,
    "changePct" REAL,
    "volume" REAL,
    "value" REAL,
    "trades" INTEGER,
    "yield" REAL
);

-- CreateIndex
CREATE UNIQUE INDEX "SukukInstrument_code_key" ON "SukukInstrument"("code");

-- CreateIndex
CREATE INDEX "SukukInstrument_isin_idx" ON "SukukInstrument"("isin");

-- CreateIndex
CREATE INDEX "SukukQuote_code_scrapedAt_idx" ON "SukukQuote"("code", "scrapedAt");

-- CreateIndex
CREATE INDEX "SukukQuote_scrapedAt_idx" ON "SukukQuote"("scrapedAt");

-- CreateIndex
CREATE INDEX "SukukHistoricalPrice_code_idx" ON "SukukHistoricalPrice"("code");

-- CreateIndex
CREATE INDEX "SukukHistoricalPrice_date_idx" ON "SukukHistoricalPrice"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SukukHistoricalPrice_code_date_key" ON "SukukHistoricalPrice"("code", "date");

