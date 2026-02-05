-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClinicalTrial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "indication" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "country" TEXT NOT NULL,
    "sponsor" TEXT NOT NULL,
    "trialId" TEXT,
    "startDate" DATETIME,
    "completionDate" DATETIME,
    "primaryEndpoint" TEXT,
    "outcome" TEXT,
    "citations" TEXT NOT NULL,
    "outcomeVerified" BOOLEAN NOT NULL DEFAULT false,
    "outcomeSource" TEXT,
    "outcomeNotes" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'VERIFIED',
    "confidenceLevel" TEXT NOT NULL DEFAULT 'HIGH',
    "lastVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClinicalTrial" ("citations", "completionDate", "country", "createdAt", "id", "indication", "molecule", "outcome", "phase", "primaryEndpoint", "sponsor", "startDate", "status", "trialId") SELECT "citations", "completionDate", "country", "createdAt", "id", "indication", "molecule", "outcome", "phase", "primaryEndpoint", "sponsor", "startDate", "status", "trialId" FROM "ClinicalTrial";
DROP TABLE "ClinicalTrial";
ALTER TABLE "new_ClinicalTrial" RENAME TO "ClinicalTrial";
CREATE TABLE "new_DiseaseMarket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disease" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "prevalenceMillions" REAL NOT NULL,
    "incidenceMillions" REAL NOT NULL,
    "treatedRatePercent" REAL NOT NULL,
    "avgAnnualTherapyCostUSD" REAL NOT NULL,
    "marketSizeUSD" REAL,
    "dataSource" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'CURATED',
    "confidenceLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "confidenceBands" TEXT,
    "assumptions" TEXT,
    "lastVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DiseaseMarket" ("avgAnnualTherapyCostUSD", "country", "createdAt", "dataSource", "disease", "id", "incidenceMillions", "marketSizeUSD", "prevalenceMillions", "treatedRatePercent", "year") SELECT "avgAnnualTherapyCostUSD", "country", "createdAt", "dataSource", "disease", "id", "incidenceMillions", "marketSizeUSD", "prevalenceMillions", "treatedRatePercent", "year" FROM "DiseaseMarket";
DROP TABLE "DiseaseMarket";
ALTER TABLE "new_DiseaseMarket" RENAME TO "DiseaseMarket";
CREATE UNIQUE INDEX "DiseaseMarket_disease_country_year_key" ON "DiseaseMarket"("disease", "country", "year");
CREATE TABLE "new_DrugPricing" (
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
    "dataQuality" TEXT NOT NULL DEFAULT 'CURATED',
    "confidenceLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "confidenceBands" TEXT,
    "assumptions" TEXT,
    "lastVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DrugPricing" ("beneficiaries", "brandPriceUSD", "ceilingPriceINR", "costPerClaimUSD", "country", "createdAt", "dataConfidence", "dataSource", "genericPriceUSD", "id", "molecule", "mrpINR", "priceErosionPct", "totalClaims", "totalSpendingUSD", "year") SELECT "beneficiaries", "brandPriceUSD", "ceilingPriceINR", "costPerClaimUSD", "country", "createdAt", "dataConfidence", "dataSource", "genericPriceUSD", "id", "molecule", "mrpINR", "priceErosionPct", "totalClaims", "totalSpendingUSD", "year" FROM "DrugPricing";
DROP TABLE "DrugPricing";
ALTER TABLE "new_DrugPricing" RENAME TO "DrugPricing";
CREATE UNIQUE INDEX "DrugPricing_molecule_country_year_key" ON "DrugPricing"("molecule", "country", "year");
CREATE TABLE "new_GenericCompetition" (
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
    "dataQuality" TEXT NOT NULL DEFAULT 'CURATED',
    "confidenceLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assumptions" TEXT,
    "lastVerified" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_GenericCompetition" ("activeManufacturers", "avgGenericPriceVsBrandPct", "biosimilarApprovals", "brandMarketSharePct", "competitionIntensity", "country", "createdAt", "dataSource", "firstGenericDate", "genericApprovals", "genericPenetrationPct", "id", "molecule", "topCompetitors", "year") SELECT "activeManufacturers", "avgGenericPriceVsBrandPct", "biosimilarApprovals", "brandMarketSharePct", "competitionIntensity", "country", "createdAt", "dataSource", "firstGenericDate", "genericApprovals", "genericPenetrationPct", "id", "molecule", "topCompetitors", "year" FROM "GenericCompetition";
DROP TABLE "GenericCompetition";
ALTER TABLE "new_GenericCompetition" RENAME TO "GenericCompetition";
CREATE UNIQUE INDEX "GenericCompetition_molecule_country_year_key" ON "GenericCompetition"("molecule", "country", "year");
CREATE TABLE "new_Patent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "patentNumber" TEXT NOT NULL,
    "patentType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "filingDate" DATETIME,
    "expiryDate" DATETIME NOT NULL,
    "title" TEXT,
    "assignee" TEXT,
    "devicePatent" BOOLEAN NOT NULL DEFAULT false,
    "litigationHistory" TEXT,
    "litigationRisk" TEXT,
    "dataQuality" TEXT NOT NULL DEFAULT 'CURATED',
    "confidenceLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dataSource" TEXT,
    "lastVerified" DATETIME,
    "reviewedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Patent" ("assignee", "country", "createdAt", "expiryDate", "filingDate", "id", "isPrimary", "molecule", "patentNumber", "patentType", "status", "title") SELECT "assignee", "country", "createdAt", "expiryDate", "filingDate", "id", "isPrimary", "molecule", "patentNumber", "patentType", "status", "title" FROM "Patent";
DROP TABLE "Patent";
ALTER TABLE "new_Patent" RENAME TO "Patent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
