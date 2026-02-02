/*
  Warnings:

  - You are about to drop the column `condition` on the `ClinicalTrial` table. All the data in the column will be lost.
  - You are about to drop the column `citations` on the `Patent` table. All the data in the column will be lost.
  - You are about to drop the column `ftoFlag` on the `Patent` table. All the data in the column will be lost.
  - You are about to drop the column `jurisdiction` on the `Patent` table. All the data in the column will be lost.
  - Added the required column `indication` to the `ClinicalTrial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `Patent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patentNumber` to the `Patent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patentType` to the `Patent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Molecule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brandName" TEXT,
    "indication" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "innovatorCompany" TEXT NOT NULL,
    "launchYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DiseaseMarket" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RegulatoryStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approvalDate" DATETIME,
    "approvalType" TEXT,
    "referenceProduct" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ClinicalTrial" ("citations", "country", "id", "molecule", "phase", "sponsor") SELECT "citations", "country", "id", "molecule", "phase", "sponsor" FROM "ClinicalTrial";
DROP TABLE "ClinicalTrial";
ALTER TABLE "new_ClinicalTrial" RENAME TO "ClinicalTrial";
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Patent" ("expiryDate", "id", "molecule", "status") SELECT "expiryDate", "id", "molecule", "status" FROM "Patent";
DROP TABLE "Patent";
ALTER TABLE "new_Patent" RENAME TO "Patent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Molecule_name_key" ON "Molecule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DiseaseMarket_disease_country_year_key" ON "DiseaseMarket"("disease", "country", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryStatus_molecule_country_key" ON "RegulatoryStatus"("molecule", "country");
