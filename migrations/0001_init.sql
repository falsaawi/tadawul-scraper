-- CreateTable
CREATE TABLE "ScrapeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "StockRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "week52High" REAL,
    "week52Low" REAL,
    "lastTradePrice" REAL,
    "lastTradeVolume" INTEGER,
    "lastTradeChange" REAL,
    "lastTradePctChange" REAL,
    "numberOfTrades" INTEGER,
    "cumulativeVolume" INTEGER,
    "todayOpen" REAL,
    "todayHigh" REAL,
    "todayLow" REAL,
    "bestBidPrice" REAL,
    "bestBidQuantity" INTEGER,
    "bestOfferPrice" REAL,
    "bestOfferQuantity" INTEGER,
    CONSTRAINT "StockRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScrapeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "sector" TEXT,
    "details" TEXT,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "category" TEXT,
    CONSTRAINT "Announcement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dividend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "announcedDate" TEXT,
    "eligibilityDate" TEXT,
    "distributionDate" TEXT,
    "distributionWay" TEXT,
    "dividendAmount" TEXT,
    CONSTRAINT "Dividend_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "tradingDate" TEXT,
    "shareholder" TEXT,
    "designation" TEXT,
    "sharesHeld" TEXT,
    "sharesPrev" TEXT,
    "sharesChange" TEXT,
    CONSTRAINT "BoardMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorporateAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "details" TEXT,
    CONSTRAINT "CorporateAction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HistoricalPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "open" REAL,
    "high" REAL,
    "low" REAL,
    "close" REAL,
    "change" REAL,
    "changePct" REAL,
    "volume" BIGINT,
    "value" REAL,
    "trades" INTEGER
);

-- CreateTable
CREATE TABLE "InvestmentUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExpenseStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "cardName" TEXT,
    "cardNumber" TEXT,
    "statementMonth" TEXT NOT NULL,
    "statementLabel" TEXT,
    "totalSpend" REAL,
    "totalDebits" REAL,
    "totalCredits" REAL,
    "fees" REAL,
    "vat" REAL,
    "openingBalance" REAL,
    "closingBalance" REAL,
    "minimumDue" REAL,
    "totalDue" REAL,
    "dueDate" TEXT,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "parsedSum" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "statementId" TEXT NOT NULL,
    "txnDate" DATETIME,
    "postDate" DATETIME,
    "merchant" TEXT NOT NULL,
    "city" TEXT,
    "rawDesc" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT,
    "foreignAmount" REAL,
    "category" TEXT NOT NULL,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ExpenseTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "ExpenseStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentCash" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "capitalFirm" TEXT NOT NULL,
    "portfolio" TEXT,
    "amount" REAL NOT NULL,
    CONSTRAINT "InvestmentCash_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InvestmentUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentSaudiStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "capitalFirm" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "companyName" TEXT,
    "qty" REAL NOT NULL,
    "stockCost" REAL,
    "totalCost" REAL,
    "brokerMarketPrice" REAL,
    "brokerCurrentValue" REAL,
    CONSTRAINT "InvestmentSaudiStock_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InvestmentUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentSaudiFund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "capitalFirm" TEXT NOT NULL,
    "fundName" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "costPerUnit" REAL,
    "totalCost" REAL,
    "closePrice" REAL,
    "marketValue" REAL,
    CONSTRAINT "InvestmentSaudiFund_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InvestmentUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentUsaStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "costValue" REAL,
    "closePrice" REAL,
    "marketValue" REAL,
    "profitLoss" REAL,
    CONSTRAINT "InvestmentUsaStock_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InvestmentUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentGulfStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "capitalFirm" TEXT,
    "market" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "qty" REAL NOT NULL,
    "marketPrice" REAL,
    "currentValue" REAL,
    CONSTRAINT "InvestmentGulfStock_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InvestmentUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvestmentTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT,
    "changes" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DividendUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "DividendSymbolMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DividendPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "symbol" TEXT,
    "value" REAL NOT NULL,
    "perShare" REAL,
    "units" REAL,
    "distDate" DATETIME,
    "eligibilityDate" DATETIME,
    "announceDate" DATETIME,
    "type" TEXT,
    "status" TEXT,
    CONSTRAINT "DividendPayment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "DividendUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScrapeSession_startedAt_idx" ON "ScrapeSession"("startedAt");

-- CreateIndex
CREATE INDEX "ScrapeSession_status_idx" ON "ScrapeSession"("status");

-- CreateIndex
CREATE INDEX "StockRecord_sessionId_idx" ON "StockRecord"("sessionId");

-- CreateIndex
CREATE INDEX "StockRecord_symbol_scrapedAt_idx" ON "StockRecord"("symbol", "scrapedAt");

-- CreateIndex
CREATE INDEX "StockRecord_scrapedAt_idx" ON "StockRecord"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_symbol_key" ON "CompanyProfile"("symbol");

-- CreateIndex
CREATE INDEX "CompanyProfile_sector_idx" ON "CompanyProfile"("sector");

-- CreateIndex
CREATE INDEX "Announcement_profileId_idx" ON "Announcement"("profileId");

-- CreateIndex
CREATE INDEX "Dividend_profileId_idx" ON "Dividend"("profileId");

-- CreateIndex
CREATE INDEX "BoardMember_profileId_idx" ON "BoardMember"("profileId");

-- CreateIndex
CREATE INDEX "CorporateAction_profileId_idx" ON "CorporateAction"("profileId");

-- CreateIndex
CREATE INDEX "FinancialStatement_symbol_idx" ON "FinancialStatement"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialStatement_symbol_period_type_key" ON "FinancialStatement"("symbol", "period", "type");

-- CreateIndex
CREATE INDEX "HistoricalPrice_symbol_idx" ON "HistoricalPrice"("symbol");

-- CreateIndex
CREATE INDEX "HistoricalPrice_date_idx" ON "HistoricalPrice"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPrice_symbol_date_key" ON "HistoricalPrice"("symbol", "date");

-- CreateIndex
CREATE INDEX "InvestmentUpload_uploadedAt_idx" ON "InvestmentUpload"("uploadedAt");

-- CreateIndex
CREATE INDEX "ExpenseStatement_statementMonth_idx" ON "ExpenseStatement"("statementMonth");

-- CreateIndex
CREATE INDEX "ExpenseStatement_bank_idx" ON "ExpenseStatement"("bank");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseStatement_bank_cardNumber_statementMonth_key" ON "ExpenseStatement"("bank", "cardNumber", "statementMonth");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_statementId_idx" ON "ExpenseTransaction"("statementId");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_category_idx" ON "ExpenseTransaction"("category");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_txnDate_idx" ON "ExpenseTransaction"("txnDate");

-- CreateIndex
CREATE INDEX "InvestmentCash_uploadId_idx" ON "InvestmentCash"("uploadId");

-- CreateIndex
CREATE INDEX "InvestmentSaudiStock_uploadId_idx" ON "InvestmentSaudiStock"("uploadId");

-- CreateIndex
CREATE INDEX "InvestmentSaudiStock_stockCode_idx" ON "InvestmentSaudiStock"("stockCode");

-- CreateIndex
CREATE INDEX "InvestmentSaudiFund_uploadId_idx" ON "InvestmentSaudiFund"("uploadId");

-- CreateIndex
CREATE INDEX "InvestmentUsaStock_uploadId_idx" ON "InvestmentUsaStock"("uploadId");

-- CreateIndex
CREATE INDEX "InvestmentGulfStock_uploadId_idx" ON "InvestmentGulfStock"("uploadId");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_createdAt_idx" ON "InvestmentTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "InvestmentTransaction_entityType_entityId_idx" ON "InvestmentTransaction"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DividendUpload_uploadedAt_idx" ON "DividendUpload"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DividendSymbolMap_company_key" ON "DividendSymbolMap"("company");

-- CreateIndex
CREATE INDEX "DividendSymbolMap_symbol_idx" ON "DividendSymbolMap"("symbol");

-- CreateIndex
CREATE INDEX "DividendPayment_uploadId_idx" ON "DividendPayment"("uploadId");

-- CreateIndex
CREATE INDEX "DividendPayment_symbol_idx" ON "DividendPayment"("symbol");

-- CreateIndex
CREATE INDEX "DividendPayment_distDate_idx" ON "DividendPayment"("distDate");

