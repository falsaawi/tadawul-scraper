-- AlterTable: add AI price target + upside to StockAnalysis
ALTER TABLE "StockAnalysis" ADD COLUMN "priceTarget" REAL;
ALTER TABLE "StockAnalysis" ADD COLUMN "upside" REAL;
