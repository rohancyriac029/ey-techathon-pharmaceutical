# Real Data Integration Documentation

## Overview

This document details the integration of **real pharmaceutical data** from public APIs into the EY Techathon Pharmaceutical Decision Platform. The implementation replaces synthetic/AI-generated data with actual clinical trial and regulatory data from authoritative sources.

**Date Implemented:** February 1, 2026  
**Data Sources:** ClinicalTrials.gov API v2, OpenFDA Drugs@FDA API

---

## Table of Contents

1. [Data Sources](#data-sources)
2. [Target Molecules](#target-molecules)
3. [Files Created](#files-created)
4. [API Documentation](#api-documentation)
5. [Data Transformation Logic](#data-transformation-logic)
6. [Database Schema Mapping](#database-schema-mapping)
7. [How to Recreate](#how-to-recreate)
8. [Data Statistics](#data-statistics)
9. [Extending the Data](#extending-the-data)
10. [Troubleshooting](#troubleshooting)

---

## Data Sources

### 1. ClinicalTrials.gov API v2

**Base URL:** `https://clinicaltrials.gov/api/v2/studies`

**Purpose:** Fetches real clinical trial data including:
- NCT IDs (unique trial identifiers)
- Trial phases (Phase I, II, III, IV)
- Trial status (Recruiting, Completed, Terminated, etc.)
- Sponsors and collaborators
- Conditions/indications being studied
- Primary endpoints and outcomes
- Study locations (countries)
- Start and completion dates

**Authentication:** None required (public API)

**Rate Limits:** No strict limits, but we implement 500ms delays between requests

**Documentation:** https://clinicaltrials.gov/data-api/api

### 2. OpenFDA Drugs@FDA API

**Base URL:** `https://api.fda.gov/drug/drugsfda.json`

**Purpose:** Fetches FDA approval and regulatory data including:
- Brand names and generic names
- Sponsor/manufacturer information
- Approval dates
- Application numbers (NDA/BLA/ANDA)
- Approval types

**Authentication:** None required (public API, optional API key for higher limits)

**Rate Limits:** 
- Without API key: 40 requests/minute, 1000 requests/day
- With API key: 240 requests/minute

**Documentation:** https://open.fda.gov/apis/drug/drugsfda/

---

## Target Molecules

We selected **10 strategically important molecules** across different therapeutic areas and modalities:

| # | Molecule | Brand Name | Indication | Modality | Innovator |
|---|----------|------------|------------|----------|-----------|
| 1 | Semaglutide | Ozempic | Type 2 Diabetes | Peptide | Novo Nordisk |
| 2 | Sitagliptin | Januvia | Type 2 Diabetes | Small Molecule | Merck |
| 3 | Empagliflozin | Jardiance | Type 2 Diabetes | Small Molecule | Boehringer Ingelheim |
| 4 | Metformin | Glucophage | Type 2 Diabetes | Small Molecule | Bristol-Myers Squibb |
| 5 | Tiotropium | Spiriva | COPD | Small Molecule | Boehringer Ingelheim |
| 6 | Osimertinib | Tagrisso | NSCLC | Small Molecule | AstraZeneca |
| 7 | Pembrolizumab | Keytruda | NSCLC | mAb | Merck |
| 8 | Adalimumab | Humira | Rheumatoid Arthritis | mAb | AbbVie |
| 9 | Atorvastatin | Lipitor | Cardiovascular | Small Molecule | Pfizer |
| 10 | Lisinopril | Zestril | Hypertension | Small Molecule | AstraZeneca |

**Selection Criteria:**
- Mix of patent-protected and off-patent molecules
- Multiple therapeutic areas (diabetes, oncology, respiratory, cardiovascular, autoimmune)
- Different modalities (small molecules, peptides, monoclonal antibodies)
- High commercial relevance for Indian generic market analysis

---

## Files Created

### 1. External Data Service
**Path:** `backend/src/services/externalDataService.ts`

**Purpose:** Handles all API calls to external data sources

**Key Functions:**

```typescript
// Fetch clinical trials from ClinicalTrials.gov
fetchClinicalTrials(molecule: string, country: 'US' | 'IN', maxResults?: number): Promise<ClinicalTrialRaw[]>

// Fetch FDA drug information from OpenFDA
fetchFDADrugInfo(molecule: string): Promise<FDADrugInfo | null>

// Fetch all data for a single molecule
fetchMoleculeData(molecule: TargetMolecule): Promise<MoleculeData>

// Fetch data for all target molecules
fetchAllMoleculesData(): Promise<MoleculeData[]>

// Validate fetched data completeness
validateMoleculeData(data: MoleculeData): ValidationResult
```

**Exported Constants:**
```typescript
TARGET_MOLECULES: TargetMolecule[] // Array of 10 molecules with metadata
```

### 2. Data Transform Service
**Path:** `backend/src/services/dataTransformService.ts`

**Purpose:** Transforms raw API data to match Prisma schema format

**Key Functions:**

```typescript
// Transform molecule metadata to Prisma format
transformMolecule(molecule: TargetMolecule, fdaData: FDADrugInfo | null): MoleculeCreate

// Transform clinical trials to Prisma format
transformClinicalTrials(trials: ClinicalTrialRaw[], moleculeName: string): ClinicalTrialCreate[]

// Generate regulatory status records
transformRegulatoryStatus(molecule: TargetMolecule, fdaData: FDADrugInfo | null): RegulatoryStatusCreate[]

// Generate estimated patent data based on FDA approval
generateEstimatedPatents(molecule: TargetMolecule, fdaData: FDADrugInfo | null): PatentCreate[]

// Generate disease market data with epidemiology stats
generateDiseaseMarketData(): DiseaseMarketCreate[]
```

### 3. Real Data Seed Script
**Path:** `backend/prisma/seedRealData.ts`

**Purpose:** Orchestrates the complete data seeding process

**Execution Steps:**
1. Fetch data from external APIs for all molecules
2. Validate data completeness
3. Transform data to Prisma schema format
4. Clear existing database records
5. Seed transformed data into database
6. Verify seeded data with statistics

---

## API Documentation

### ClinicalTrials.gov API v2

#### Endpoint: Search Studies
```
GET https://clinicaltrials.gov/api/v2/studies
```

#### Query Parameters Used:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `query.intr` | Intervention/treatment search | `semaglutide` |
| `query.locn` | Location filter | `United States` or `India` |
| `filter.overallStatus` | Trial status filter | `COMPLETED,RECRUITING,ACTIVE_NOT_RECRUITING,TERMINATED` |
| `pageSize` | Results per page | `10` |
| `fields` | Specific fields to return | See below |

#### Fields Requested:
```
NCTId, BriefTitle, OverallStatus, Phase, StartDate, CompletionDate,
LeadSponsorName, Condition, InterventionName, PrimaryOutcomeMeasure,
LocationCountry, EnrollmentCount
```

#### Sample Request:
```bash
curl "https://clinicaltrials.gov/api/v2/studies?query.intr=semaglutide&query.locn=United%20States&filter.overallStatus=COMPLETED,RECRUITING,ACTIVE_NOT_RECRUITING,TERMINATED&pageSize=10&fields=NCTId,BriefTitle,OverallStatus,Phase,StartDate,CompletionDate,LeadSponsorName,Condition,InterventionName,PrimaryOutcomeMeasure,LocationCountry,EnrollmentCount"
```

#### Sample Response Structure:
```json
{
  "studies": [
    {
      "protocolSection": {
        "identificationModule": {
          "nctId": "NCT03914326",
          "briefTitle": "A Trial Comparing the Effects of Semaglutide..."
        },
        "statusModule": {
          "overallStatus": "COMPLETED",
          "startDateStruct": { "date": "2019-04-11" },
          "completionDateStruct": { "date": "2020-06-03" }
        },
        "designModule": {
          "phases": ["PHASE3"]
        },
        "sponsorCollaboratorsModule": {
          "leadSponsor": { "name": "Novo Nordisk A/S" }
        },
        "conditionsModule": {
          "conditions": ["Type 2 Diabetes Mellitus"]
        },
        "armsInterventionsModule": {
          "interventions": [{ "name": "Semaglutide" }]
        },
        "outcomesModule": {
          "primaryOutcomes": [{ "measure": "Change in HbA1c" }]
        }
      }
    }
  ],
  "totalCount": 156
}
```

### OpenFDA Drugs@FDA API

#### Endpoint: Drug Search
```
GET https://api.fda.gov/drug/drugsfda.json
```

#### Query Parameters Used:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `search` | Search query | `openfda.generic_name:"semaglutide"` |
| `limit` | Max results | `1` |

#### Sample Request:
```bash
curl "https://api.fda.gov/drug/drugsfda.json?search=openfda.generic_name:%22semaglutide%22&limit=1"
```

#### Sample Response Structure:
```json
{
  "results": [
    {
      "sponsor_name": "NOVO NORDISK",
      "openfda": {
        "brand_name": ["OZEMPIC"],
        "generic_name": ["SEMAGLUTIDE"],
        "application_number": ["NDA209637"]
      },
      "submissions": [
        {
          "submission_type": "ORIG",
          "submission_status": "AP",
          "submission_status_date": "20171205"
        }
      ]
    }
  ]
}
```

---

## Data Transformation Logic

### Phase Mapping (ClinicalTrials.gov → Database)
```typescript
const PHASE_MAP = {
  'PHASE1': 'Phase I',
  'PHASE2': 'Phase II', 
  'PHASE3': 'Phase III',
  'PHASE4': 'Phase IV',
  'EARLY_PHASE1': 'Phase I',
  'NA': 'Phase I'  // Default for missing
};
```

### Status Mapping
```typescript
const STATUS_MAP = {
  'COMPLETED': 'Completed',
  'RECRUITING': 'Recruiting',
  'ACTIVE_NOT_RECRUITING': 'Active',
  'TERMINATED': 'Terminated',
  'WITHDRAWN': 'Withdrawn',
  'SUSPENDED': 'Suspended',
  'NOT_YET_RECRUITING': 'Not Yet Recruiting',
  'ENROLLING_BY_INVITATION': 'Enrolling'
};
```

### Country Mapping
```typescript
const COUNTRY_MAP = {
  'United States': 'US',
  'India': 'IN'
};
```

### Outcome Inference Logic
```typescript
// Infer outcome based on trial status
function inferOutcome(status: string): string {
  if (status === 'Completed') return 'Positive';  // Assumption: completed trials have positive outcomes
  if (status === 'Terminated' || status === 'Withdrawn') return 'Negative';
  return 'Pending';
}
```

### Patent Generation Logic
Patents are estimated based on FDA approval dates:
- **Compound Patent:** Filing = Approval - 10 years, Expiry = Approval + 11 years
- **Formulation Patent:** Filing = Approval - 3 years, Expiry = Approval + 17 years
- **Status:** "Expired" if expiry date < current date, otherwise "Active"

---

## Database Schema Mapping

### Molecule Table
| API Field | Database Field | Source |
|-----------|---------------|--------|
| `generic_name` | `genericName` | OpenFDA |
| `brand_name[0]` | `brandName` | OpenFDA |
| `sponsor_name` | `innovatorCompany` | OpenFDA |
| Submission date | `launchYear` | OpenFDA (parsed) |
| Manual mapping | `indication` | TARGET_MOLECULES config |
| Manual mapping | `modality` | TARGET_MOLECULES config |

### ClinicalTrial Table
| API Field | Database Field | Source |
|-----------|---------------|--------|
| `nctId` | `trialId` | ClinicalTrials.gov |
| `conditions[0]` | `indication` | ClinicalTrials.gov |
| `phases[0]` | `phase` | ClinicalTrials.gov (mapped) |
| `overallStatus` | `status` | ClinicalTrials.gov (mapped) |
| `leadSponsor.name` | `sponsor` | ClinicalTrials.gov |
| `startDateStruct.date` | `startDate` | ClinicalTrials.gov |
| `completionDateStruct.date` | `completionDate` | ClinicalTrials.gov |
| `primaryOutcomes[0].measure` | `primaryEndpoint` | ClinicalTrials.gov |
| Location filter | `country` | Request parameter |
| Inferred | `outcome` | Logic based on status |

### RegulatoryStatus Table
| API Field | Database Field | Source |
|-----------|---------------|--------|
| Submission date | `approvalDate` | OpenFDA |
| `application_number` prefix | `approvalType` | OpenFDA (NDA/BLA/ANDA) |
| Fixed value | `status` | "Approved" |
| `brand_name[0]` | `referenceProduct` | OpenFDA (for India) |

### Patent Table
| Field | Logic | Source |
|-------|-------|--------|
| `patentNumber` | Generated (US prefix + hash) | Estimated |
| `patentType` | COMPOUND or FORMULATION | Generated |
| `filingDate` | Approval - 10 or 3 years | Calculated |
| `expiryDate` | Approval + 11 or 17 years | Calculated |
| `status` | Active/Expired based on expiry | Calculated |

### DiseaseMarket Table
| Field | Source |
|-------|--------|
| `disease` | Manual mapping from indications |
| `prevalenceMillions` | CDC, WHO, IDF statistics |
| `incidenceMillions` | Public health reports |
| `treatedRatePercent` | Healthcare access estimates |
| `avgAnnualTherapyCostUSD` | Market research |
| `marketSizeUSD` | Calculated |
| `dataSource` | Citation |

---

## How to Recreate

### Prerequisites
- Node.js 18+ installed
- Backend dependencies installed (`cd backend && npm install`)
- Database initialized (`npx prisma migrate dev`)

### Step 1: Run the Real Data Seed
```bash
cd backend
npm run seed:real
```

Or using npx directly:
```bash
cd backend
npx ts-node prisma/seedRealData.ts
```

### Step 2: Verify the Data
```bash
# Using the Python viewer script
cd ..
python view_db.py

# Or using Prisma Studio
cd backend
npx prisma studio
```

### Step 3: Revert to Synthetic Data (if needed)
```bash
cd backend
npm run prisma:seed
```

### Available npm Scripts
```json
{
  "prisma:seed": "npx ts-node prisma/seed.ts",      // Original synthetic data
  "prisma:seed:real": "npx ts-node prisma/seedRealData.ts",  // Real API data
  "seed:real": "npx ts-node prisma/seedRealData.ts"  // Alias
}
```

---

## Data Statistics

After running `npm run seed:real`, the database contains:

| Entity | Count | Notes |
|--------|-------|-------|
| **Molecules** | 10 | All target molecules |
| **Clinical Trials** | 191 | Real NCT IDs from ClinicalTrials.gov |
| **Patents** | 30 | 3 per molecule (US compound, US formulation, IN compound) |
| **Regulatory Statuses** | 20 | 2 per molecule (US and IN) |
| **Disease Markets** | 12 | 6 diseases × 2 countries |

### Clinical Trials Breakdown
| Phase | Count |
|-------|-------|
| Phase III | 84 |
| Phase II | 42 |
| Phase I | 41 |
| Phase IV | 24 |

| Country | Count |
|---------|-------|
| US | 100 |
| India | 91 |

### Patents Breakdown
| Status | Count |
|--------|-------|
| Active | 15 |
| Expired | 15 |

| Type | Count |
|------|-------|
| COMPOUND | 20 |
| FORMULATION | 10 |

---

## Extending the Data

### Adding New Molecules

1. Update `TARGET_MOLECULES` in `externalDataService.ts`:
```typescript
export const TARGET_MOLECULES: TargetMolecule[] = [
  // ... existing molecules
  {
    name: 'NewMolecule',
    searchTerms: ['newmolecule', 'new molecule'],
    indication: 'Target Indication',
    modality: 'small-molecule',  // or 'mAb', 'peptide', 'biosimilar'
  },
];
```

2. Re-run the seed script:
```bash
npm run seed:real
```

### Adding New Data Sources

To integrate additional APIs (e.g., EMA, WHO):

1. Add new fetch functions in `externalDataService.ts`:
```typescript
export async function fetchEMAData(molecule: string): Promise<EMAData> {
  // Implementation
}
```

2. Add transformation logic in `dataTransformService.ts`

3. Update `seedRealData.ts` to call the new functions

### Increasing Trial Count

Modify `maxResults` parameter in `fetchClinicalTrials()`:
```typescript
// In seedRealData.ts, increase from 10 to 50
const usTrials = await fetchClinicalTrials(molecule.name, 'US', 50);
const inTrials = await fetchClinicalTrials(molecule.name, 'IN', 50);
```

### Adding Real Patent Data

For real patent data, integrate with:
- **USPTO Patent Database:** https://developer.uspto.gov/api-catalog
- **EPO Open Patent Services:** https://www.epo.org/searching-for-patents/data/web-services/ops.html
- **Google Patents API** (unofficial)

---

## Troubleshooting

### Common Issues

#### 1. API Rate Limiting
**Symptom:** `429 Too Many Requests` errors

**Solution:** Increase delay between requests in `externalDataService.ts`:
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // Increase from 500ms
```

#### 2. No FDA Data Found
**Symptom:** FDA data returns null for a molecule

**Cause:** Generic name doesn't match exactly in OpenFDA

**Solution:** Try alternative search terms:
```typescript
// Try brand name instead
const response = await axios.get(OPENFDA_BASE_URL, {
  params: { search: `openfda.brand_name:"${brandName}"`, limit: 1 }
});
```

#### 3. Missing Clinical Trials for India
**Symptom:** Few or no trials returned for India location

**Cause:** Not all trials have India as a registered location

**Solution:** This is expected - Indian trial registration (CTRI) is separate from ClinicalTrials.gov. The data we get represents international trials with Indian sites.

#### 4. Unicode/Emoji Errors in Python Script
**Symptom:** `UnicodeEncodeError` when running `view_db.py`

**Solution:** Set encoding environment variable:
```powershell
$env:PYTHONIOENCODING="utf-8"; python view_db.py
```

#### 5. Database Lock Errors
**Symptom:** `SQLITE_BUSY` errors during seeding

**Solution:** Close Prisma Studio and any other database connections before seeding.

### Validation Checks

The seed script includes validation to ensure data quality:
- Checks that FDA data was retrieved for each molecule
- Verifies minimum trial counts (warns if < 5 trials)
- Reports any molecules with missing data

---

## Future Enhancements

### Recommended Additions

1. **Real Patent Data Integration**
   - Integrate USPTO API for actual patent numbers and expiry dates
   - Add patent family information

2. **More Geographic Coverage**
   - Add EU (EMA) regulatory data
   - Include Japan (PMDA) approvals
   - Add China (NMPA) data

3. **Historical Pricing Data**
   - Integrate GoodRx or similar APIs for US pricing
   - Add Indian price data from NPPA

4. **Competitor Analysis Data**
   - Add biosimilar/generic competitor information
   - Include market share estimates

5. **Real-time Updates**
   - Implement scheduled data refresh
   - Add webhook notifications for trial status changes

### Data Quality Improvements

1. **Outcome Verification**
   - Cross-reference trial results with publications
   - Add links to published papers

2. **Patent Verification**
   - Validate generated patent numbers against real databases
   - Add patent litigation status

3. **Market Data Updates**
   - Use more recent epidemiology sources
   - Add regional market size breakdowns

---

## References

### API Documentation
- ClinicalTrials.gov API: https://clinicaltrials.gov/data-api/api
- OpenFDA API: https://open.fda.gov/apis/
- FDA Orange Book: https://www.fda.gov/drugs/drug-approvals-and-databases/approved-drug-products-therapeutic-equivalence-evaluations-orange-book

### Data Sources
- CDC National Diabetes Statistics Report 2024
- IDF Diabetes Atlas 2024
- American Lung Association COPD Statistics
- American Cancer Society Cancer Facts & Figures
- WHO Global Health Observatory

### Code Files
- `backend/src/services/externalDataService.ts` - API fetching
- `backend/src/services/dataTransformService.ts` - Data transformation
- `backend/prisma/seedRealData.ts` - Seeding orchestration
- `backend/prisma/seed.ts` - Original synthetic data (backup)

---

*Documentation Version: 1.0*  
*Last Updated: February 1, 2026*
