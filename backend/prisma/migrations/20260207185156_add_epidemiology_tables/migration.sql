-- CreateTable
CREATE TABLE "DiseaseEpidemiology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disease" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "prevalenceTotal" INTEGER NOT NULL,
    "incidenceAnnual" INTEGER NOT NULL,
    "mortalityAnnual" INTEGER NOT NULL,
    "prevalenceRate" REAL NOT NULL,
    "incidenceRate" REAL NOT NULL,
    "mortalityRate" REAL NOT NULL,
    "diagnosedPercent" REAL NOT NULL,
    "treatedPercent" REAL NOT NULL,
    "controlledPercent" REAL,
    "malePercent" REAL,
    "femalePercent" REAL,
    "avgAgeAtDiagnosis" REAL,
    "age65PlusPercent" REAL,
    "prevalenceChangeYoY" REAL,
    "incidenceChangeYoY" REAL,
    "mortalityChangeYoY" REAL,
    "dataSource" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "publicationYear" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DrugUtilization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalPatientsOnDrug" INTEGER NOT NULL,
    "newPatientsAnnual" INTEGER,
    "discontinuationRate" REAL,
    "totalPrescriptions" INTEGER NOT NULL,
    "prescriptionsPerPatient" REAL,
    "patientCountChangeYoY" REAL,
    "prescriptionChangeYoY" REAL,
    "marketSharePercent" REAL,
    "dataSource" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EpidemiologyTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "disease" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" REAL NOT NULL,
    "dataSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DiseaseEpidemiology_disease_country_year_key" ON "DiseaseEpidemiology"("disease", "country", "year");

-- CreateIndex
CREATE UNIQUE INDEX "DrugUtilization_molecule_country_year_key" ON "DrugUtilization"("molecule", "country", "year");

-- CreateIndex
CREATE UNIQUE INDEX "EpidemiologyTrend_disease_country_metric_year_key" ON "EpidemiologyTrend"("disease", "country", "metric", "year");
