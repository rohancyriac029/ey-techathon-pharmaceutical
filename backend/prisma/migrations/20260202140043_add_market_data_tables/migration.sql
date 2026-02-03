-- CreateTable
CREATE TABLE "DrugPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSpendingUSD" REAL,
    "totalClaims" INTEGER,
    "costPerClaimUSD" REAL,
    "beneficiaries" INTEGER,
    "brandPriceUSD" REAL,
    "genericPriceUSD" REAL,
    "priceErosionPct" REAL,
    "mrpINR" REAL,
    "ceilingPriceINR" REAL,
    "dataSource" TEXT NOT NULL,
    "dataConfidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GenericCompetition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "genericApprovals" INTEGER NOT NULL,
    "biosimilarApprovals" INTEGER NOT NULL DEFAULT 0,
    "activeManufacturers" INTEGER NOT NULL,
    "topCompetitors" TEXT,
    "firstGenericDate" DATETIME,
    "brandMarketSharePct" REAL,
    "genericPenetrationPct" REAL,
    "avgGenericPriceVsBrandPct" REAL,
    "competitionIntensity" TEXT NOT NULL DEFAULT 'LOW',
    "dataSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MarketGrowth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disease" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "cagr5YearHistoric" REAL,
    "cagr5YearProjected" REAL,
    "genericErosionRate" REAL,
    "dataSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DrugPricing_molecule_country_year_key" ON "DrugPricing"("molecule", "country", "year");

-- CreateIndex
CREATE UNIQUE INDEX "GenericCompetition_molecule_country_year_key" ON "GenericCompetition"("molecule", "country", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MarketGrowth_disease_country_year_key" ON "MarketGrowth"("disease", "country", "year");
