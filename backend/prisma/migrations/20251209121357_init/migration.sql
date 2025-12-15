-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queryText" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resultId" TEXT,
    "trace" TEXT,
    "cacheKey" TEXT
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "pdfPath" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClinicalTrial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condition" TEXT NOT NULL,
    "molecule" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "sponsor" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "citations" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Patent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "molecule" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiryDate" DATETIME NOT NULL,
    "ftoFlag" TEXT NOT NULL,
    "citations" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_jobId_key" ON "Report"("jobId");
