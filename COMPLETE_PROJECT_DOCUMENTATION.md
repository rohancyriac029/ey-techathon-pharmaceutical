# Pharmaceutical Intelligence Platform - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Synthetic Dataset Specification](#synthetic-dataset-specification)
4. [Database Schema & Models](#database-schema--models)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Agent System Deep Dive](#agent-system-deep-dive)
8. [Advanced Analytics Features](#advanced-analytics-features)
9. [API Reference](#api-reference)
10. [Setup & Deployment](#setup--deployment)
11. [Example Usage Scenarios](#example-usage-scenarios)

---

## Project Overview

The Pharmaceutical Intelligence Platform is a **multi-agent AI system** designed for pharmaceutical market intelligence. It combines clinical trial analysis, patent landscape assessment, competitive analysis, and strategic recommendations powered by Google Gemini AI.

### Key Capabilities

- **Clinical Trial Analysis**: Query and analyze mock clinical trial data across multiple therapeutic areas
- **Patent Landscape Mapping**: Calculate Freedom-to-Operate (FTO) risk based on patent expiry dates
- **Competitive Intelligence**: Assess competitive intensity and identify undercrowded opportunities
- **Licensing Signal Detection**: Identify molecules with strong licensing potential
- **Geographic Market Readiness**: Evaluate market entry readiness by country
- **Patent Cliff Radar**: Track upcoming patent expiries for generic development opportunities
- **AI-Generated Reports**: Executive summaries and strategic recommendations via Gemini AI
- **PDF Report Generation**: Professional downloadable reports with PDFKit

### Use Cases

1. **Business Development**: Identify licensing opportunities in specific therapeutic areas
2. **Generic Drug Development**: Find molecules with expired or expiring patents
3. **Market Entry Strategy**: Assess geographic readiness for market entry
4. **Competitive Intelligence**: Understand competitive landscape and saturation
5. **Portfolio Planning**: Discover underserved therapeutic areas with low competition

---

## Architecture & Technology Stack

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React 18 + Vite 7 + Tailwind CSS 4           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  ChatInput   │  │ AgentTimeline│  │  Dashboard   │          │
│  │  (Query UI)  │  │ (Real-time)  │  │ (Reports)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                   HTTP REST API (Express)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│              Node.js + Express 4 + TypeScript                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     MASTER AGENT                          │  │
│  │  - Query parsing with Gemini AI                          │  │
│  │  - Agent orchestration                                    │  │
│  │  - Cache management                                       │  │
│  │  - Job lifecycle tracking                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
│  │  Clinical   │    │   Patent    │    │    Synthesis    │     │
│  │   Trials    │    │   Agent     │    │     Engine      │     │
│  │   Agent     │    │             │    │                 │     │
│  │             │    │ - FTO calc  │    │ - Score calc    │     │
│  │ - Query DB  │    │ - Cliff     │    │ - Competitive   │     │
│  │ - Aggregate │    │   analysis  │    │   analysis      │     │
│  └─────────────┘    └─────────────┘    │ - Licensing     │     │
│                                        │   signals       │     │
│                                        └─────────────────┘     │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                         │
│                    │ Report Generator│                         │
│                    │ - AI summary    │                         │
│                    │ - Recommends    │                         │
│                    │ - PDF creation  │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Prisma ORM Layer
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE (SQLite)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Job    │  │  Report  │  │ Clinical │  │  Patent  │       │
│  │          │  │          │  │  Trial   │  │          │       │
│  │ - Status │  │ - Summary│  │ - 103    │  │ - 103    │       │
│  │ - Trace  │  │ - PDF    │  │  records │  │  records │       │
│  │ - Cache  │  │ - Data   │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.3.1 | UI framework |
| | Vite | 7.0.4 | Build tool & dev server |
| | Tailwind CSS | 4.0.0 | Utility-first styling |
| | TypeScript | 5.7.3 | Type safety |
| **Backend** | Node.js | 20.19+ / 22.12+ | Runtime environment |
| | Express | 4.21.2 | Web framework |
| | TypeScript | 5.7.3 | Type safety |
| | Prisma | 6.1.0 | ORM for database |
| **Database** | SQLite | 3.x | Embedded database |
| **AI** | Google Gemini | 2.5 Flash | LLM for analysis |
| **PDF** | PDFKit | 0.15.1 | PDF generation |
| **Utilities** | ts-node-dev | - | Development server |
| | Zod | 3.24.1 | Schema validation |
| | Axios | 1.7.9 | HTTP client |

---

## Synthetic Dataset Specification

### Overview

The database is seeded with **206 total records**:
- **3 demo scenario molecules** (manually crafted)
- **100 random clinical trials** (algorithmically generated)
- **100 random patents** (algorithmically generated)
- **30 shared molecules** across both trials and patents

### Data Generation Strategy

#### 1. Shared Molecule Pool

To ensure realistic overlap between clinical trials and patents, a **shared pool of 30 molecules** is generated first:

```typescript
// From seed.ts
const MOLECULE_PREFIXES = ['Respi', 'Cardio', 'Onco', 'Metabo', 'Immuno', 'Neuro'];
const MOLECULE_SUFFIXES = ['vir', 'mab', 'nib', 'fen', 'stat', 'zone'];

function generateMoleculeName(): string {
  const prefix = getRandom(MOLECULE_PREFIXES);  // e.g., "Respi"
  const suffix = getRandom(MOLECULE_SUFFIXES);  // e.g., "mab"
  const number = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${prefix}${suffix}-${number}`;  // e.g., "Respimab-347"
}

const SHARED_MOLECULES = Array.from({ length: 30 }, generateMoleculeName);
```

**Example Generated Molecules**:
- `Respivir-523` (Respiratory viral)
- `Cardiomab-189` (Cardiovascular monoclonal antibody)
- `Onconib-847` (Oncology kinase inhibitor)
- `Metabolfen-234` (Metabolic disorder)

#### 2. Demo Scenarios (Hand-Crafted)

Three carefully designed scenarios demonstrate key analytics features:

##### Scenario A: "The Golden Opportunity" - Respiflow-X

**Purpose**: Demonstrate ideal licensing candidate

| Dataset | Details |
|---------|---------|
| **Clinical Trial** | - Condition: COPD<br>- Phase: Phase III (advanced)<br>- Sponsor: Apex Research Labs<br>- Country: India<br>- Citation: PMID:11223344 |
| **Patent** | - Jurisdiction: IN (India)<br>- Status: Active<br>- Expiry: 2024-01-01 (**already expired**)<br>- FTO: LOW<br>- Citation: US-PAT-99999 |

**Analytics Output**:
- ✅ Advanced clinical development (Phase III)
- ✅ LOW FTO risk (expired patent)
- ✅ India-focused (matches local trials)
- ✅ High licensing signal

##### Scenario B: "The Blocked Path" - OncoBlock-99

**Purpose**: Demonstrate patent-blocked opportunity

| Dataset | Details |
|---------|---------|
| **Clinical Trial** | - Condition: Non-Small Cell Lung Cancer<br>- Phase: Phase II<br>- Sponsor: Roche<br>- Country: USA<br>- Citation: PMID:55667788 |
| **Patent** | - Jurisdiction: US<br>- Status: Active<br>- Expiry: 2038-05-20 (**12 years away**)<br>- FTO: HIGH<br>- Citation: US-PAT-88888 |

**Analytics Output**:
- ⚠️ Phase II (mid-stage development)
- ❌ HIGH FTO risk (blocked until 2038)
- ⚠️ Major pharma sponsor (high competition)
- ❌ Low licensing potential

##### Scenario C: "India Respiratory Focus" - Respimab-IN

**Purpose**: Demonstrate multi-trial molecule with favorable FTO

| Dataset | Details |
|---------|---------|
| **Clinical Trial 1** | - Condition: Asthma<br>- Phase: Phase II<br>- Sponsor: Sun Pharma<br>- Country: India<br>- Citation: PMID:33445566 |
| **Clinical Trial 2** | - Condition: COPD<br>- Phase: Phase I<br>- Sponsor: Cipla<br>- Country: India<br>- Citation: PMID:33445567 |
| **Patent** | - Jurisdiction: IN<br>- Status: Expired<br>- Expiry: 2022-06-15 (**expired 3.5 years ago**)<br>- FTO: LOW<br>- Citation: IN-PAT-77777 |

**Analytics Output**:
- ✅ Multiple trials (2x) = validated interest
- ✅ Indian pharma sponsors (local expertise)
- ✅ LOW FTO risk (expired patent)
- ✅ Geographic readiness for India

#### 3. Synthetic Volume Data (Algorithmically Generated)

##### Clinical Trials (100 records)

**Data Pools**:

```typescript
// Conditions (8 options)
const CONDITIONS = [
  'Non-Small Cell Lung Cancer',
  'Asthma',
  'COPD',
  'Type 2 Diabetes',
  'Hypertension',
  'Rheumatoid Arthritis',
  'Tuberculosis',
  'Idiopathic Pulmonary Fibrosis',
];

// Trial Phases (4 options)
const PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'];

// Sponsors (10 options)
const SPONSORS = [
  'Pfizer',           // US Big Pharma
  'Novartis',         // Swiss
  'Roche',            // Swiss
  'Sun Pharma',       // India
  'Cipla',            // India
  'Dr. Reddys',       // India
  'AstraZeneca',      // UK/Sweden
  'Apex Research Labs', // Fictitious
  'University of Oxford', // Academic
  'Bharat Biotech',   // India
];

// Countries (6 options)
const COUNTRIES = ['India', 'USA', 'China', 'Germany', 'Japan', 'UK'];
```

**Generation Logic**:

```typescript
for (let i = 0; i < 100; i++) {
  trialsData.push({
    condition: getRandom(CONDITIONS),
    molecule: getRandom(SHARED_MOLECULES),  // From shared pool
    phase: getRandom(PHASES),
    sponsor: getRandom(SPONSORS),
    country: getRandom(COUNTRIES),
    citations: `PMID:${Math.floor(Math.random() * 10000000)}` // Random PMID
  });
}
```

**Distribution Characteristics**:
- **Conditions**: Random uniform distribution (~12-13 trials per condition)
- **Phases**: Random uniform distribution (~25 trials per phase)
- **Molecules**: Random from 30-molecule pool (avg 3.3 trials per molecule)
- **Sponsors**: Random uniform (~10 trials per sponsor)
- **Countries**: Random uniform (~16-17 trials per country)
- **Citations**: Random 7-digit PMID numbers

##### Patents (100 records)

**Data Pools**:

```typescript
// Jurisdictions (4 options)
const JURISDICTIONS = [
  'IN',  // India
  'US',  // United States
  'EP',  // European Patent Office
  'WO',  // World Intellectual Property Organization
];

// FTO Flags (3 options)
const FTO_FLAGS = ['LOW', 'MEDIUM', 'HIGH'];
```

**Generation Logic**:

```typescript
for (let i = 0; i < 100; i++) {
  const expiry = getRandomDate(new Date('2020-01-01'), new Date('2040-01-01'));
  const isExpired = expiry < new Date();
  
  // Auto-calculate FTO based on expiry
  let calculatedFto = getRandom(FTO_FLAGS);
  if (isExpired) calculatedFto = "LOW";  // Force LOW if expired

  patentsData.push({
    molecule: getRandom(SHARED_MOLECULES),  // From shared pool
    jurisdiction: getRandom(JURISDICTIONS),
    status: isExpired ? "Expired" : "Active",
    expiryDate: expiry,
    ftoFlag: calculatedFto,
    citations: `US-PAT-${Math.floor(Math.random() * 1000000)}` // Random patent #
  });
}
```

**Expiry Date Distribution**:
- **Range**: 2020-01-01 to 2040-01-01 (20-year span)
- **Current date**: January 31, 2026
- **Expected breakdown** (approximate):
  - Expired (< 2026): ~30%
  - Expiring soon (2026-2029): ~15%
  - Active long-term (2030+): ~55%

**FTO Calculation Logic**:
```typescript
const calculateFto = (expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' => {
  const now = new Date();
  const diffYears = (expiryDate - now) / (1000 * 60 * 60 * 24 * 365);
  
  if (diffYears <= 0) return 'LOW';      // Expired - safe to develop
  if (diffYears <= 3) return 'MEDIUM';   // Expiring within 3 years
  return 'HIGH';                          // More than 3 years - blocked
};
```

**Distribution Characteristics**:
- **Molecules**: Random from 30-molecule pool (avg 3.3 patents per molecule)
- **Jurisdictions**: Random uniform (~25 patents per jurisdiction)
- **Status**: Calculated from expiry date
- **FTO**: Calculated from expiry date (with random override for synthetic variety)
- **Citations**: Random 6-digit patent numbers

### Dataset Statistics Summary

| Metric | Value |
|--------|-------|
| **Total Records** | 206 |
| **Clinical Trials** | 103 (3 demo + 100 synthetic) |
| **Patents** | 103 (3 demo + 100 synthetic) |
| **Unique Molecules** | ~33 (3 demo + ~30 shared pool) |
| **Therapeutic Areas** | 8 conditions |
| **Trial Phases** | 4 phases |
| **Sponsors** | 10 organizations |
| **Countries** | 6 jurisdictions |
| **Patent Jurisdictions** | 4 (IN, US, EP, WO) |
| **Date Range** | 2020-2040 (20 years) |

### Data Quality Features

1. **Realistic Overlap**: Shared molecule pool ensures clinical-patent correlation
2. **Demo Scenarios**: Hand-crafted examples demonstrate all analytics features
3. **Temporal Realism**: Patent expiry dates span past, present, and future
4. **Geographic Diversity**: Trials and patents span 6 countries/4 jurisdictions
5. **Sponsor Variety**: Mix of Big Pharma, Indian pharma, and academic sponsors
6. **Citation Format**: Realistic PMID and patent citation formats

---

## Database Schema & Models

### Prisma Schema Definition

```prisma
// File: backend/prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Job {
  id        String   @id @default(cuid())
  queryText String
  status    String   // "pending" | "running" | "completed" | "error"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  resultId  String?
  trace     String?  // JSON string for agent execution trace
  cacheKey  String?
  report    Report?
}

model Report {
  id         String   @id @default(cuid())
  jobId      String   @unique
  summary    String
  confidence Float
  pdfPath    String?
  data       String?  // JSON string for full report data
  createdAt  DateTime @default(now())
  job        Job      @relation(fields: [jobId], references: [id])
}

model ClinicalTrial {
  id        String @id @default(cuid())
  condition String
  molecule  String
  phase     String
  sponsor   String
  country   String
  citations String
}

model Patent {
  id           String   @id @default(cuid())
  molecule     String
  jurisdiction String
  status       String
  expiryDate   DateTime
  ftoFlag      String
  citations    String
}
```

### Model Descriptions

#### Job Model
**Purpose**: Tracks analysis job lifecycle and execution state

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String (CUID) | Unique job identifier | `clk123abc...` |
| `queryText` | String | Original user query | `"Find respiratory molecules in India"` |
| `status` | String | Execution state | `"pending"`, `"running"`, `"completed"`, `"error"` |
| `createdAt` | DateTime | Job creation timestamp | `2026-01-31T10:30:00Z` |
| `updatedAt` | DateTime | Last update timestamp | `2026-01-31T10:31:45Z` |
| `resultId` | String? | Link to Report (nullable) | `clk456def...` |
| `trace` | String? | JSON array of agent events | `[{agent:"MasterAgent",status:"running",...}]` |
| `cacheKey` | String? | Hash for query caching | `sha256:abc123...` |
| `report` | Report? | Prisma relation | - |

**Status Flow**:
```
pending → running → completed
                 ↘ error
```

#### Report Model
**Purpose**: Stores generated analysis reports and PDF metadata

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String (CUID) | Unique report identifier | `clk789ghi...` |
| `jobId` | String | Foreign key to Job | `clk123abc...` |
| `summary` | String | AI-generated executive summary | `"Analysis of 45 respiratory molecules..."` |
| `confidence` | Float | Overall confidence score (0-1) | `0.85` |
| `pdfPath` | String? | File path to PDF report | `/reports/clk789ghi.pdf` |
| `data` | String? | JSON blob of full report | `{queryText:"...",opportunities:[...]}` |
| `createdAt` | DateTime | Report creation timestamp | `2026-01-31T10:31:45Z` |
| `job` | Job | Prisma relation | - |

**Data JSON Structure**:
```typescript
interface ReportPayload {
  queryText: string;
  summary: string;
  opportunities: Opportunity[];
  trialsSummary: ClinicalAgentResult;
  patentSummary: PatentAgentResult;
  confidence: number;
  recommendations: string[];
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}
```

#### ClinicalTrial Model
**Purpose**: Mock clinical trial database for querying

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String (CUID) | Unique trial identifier | `clk234jkl...` |
| `condition` | String | Disease/condition | `"COPD"`, `"Asthma"` |
| `molecule` | String | Drug molecule name | `"Respimab-347"` |
| `phase` | String | Clinical phase | `"Phase I"`, `"Phase II"`, `"Phase III"`, `"Phase IV"` |
| `sponsor` | String | Organization conducting trial | `"Pfizer"`, `"Sun Pharma"` |
| `country` | String | Trial location | `"India"`, `"USA"` |
| `citations` | String | Reference citations | `"PMID:1234567"` |

**Query Patterns**:
```typescript
// By condition
await prisma.clinicalTrial.findMany({ 
  where: { condition: { contains: 'respiratory' } } 
});

// By country
await prisma.clinicalTrial.findMany({ 
  where: { country: 'India' } 
});

// By molecule
await prisma.clinicalTrial.findMany({ 
  where: { molecule: 'Respimab-347' } 
});
```

#### Patent Model
**Purpose**: Mock patent database for FTO analysis

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | String (CUID) | Unique patent identifier | `clk567mno...` |
| `molecule` | String | Drug molecule name | `"Respimab-347"` |
| `jurisdiction` | String | Patent jurisdiction code | `"IN"`, `"US"`, `"EP"`, `"WO"` |
| `status` | String | Patent status | `"Active"`, `"Expired"` |
| `expiryDate` | DateTime | Patent expiry date | `2028-05-15T00:00:00Z` |
| `ftoFlag` | String | Freedom-to-Operate risk | `"LOW"`, `"MEDIUM"`, `"HIGH"` |
| `citations` | String | Patent reference numbers | `"US-PAT-12345"` |

**FTO Risk Calculation**:
- **LOW**: Expired or expiring within 0 years
- **MEDIUM**: Expiring within 1-3 years
- **HIGH**: Active for 3+ years

**Query Patterns**:
```typescript
// By jurisdiction
await prisma.patent.findMany({ 
  where: { jurisdiction: 'IN' } 
});

// By molecule
await prisma.patent.findMany({ 
  where: { molecule: 'Respimab-347' } 
});

// Expired patents
await prisma.patent.findMany({ 
  where: { expiryDate: { lt: new Date() } } 
});
```

### Database Relationships

```
Job (1) ←→ (1) Report
    ↓
  cacheKey (indexed for performance)

ClinicalTrial (no relations - lookup table)
Patent (no relations - lookup table)
```

### Indexing Strategy

While SQLite auto-indexes primary keys, for production scale:

```sql
-- Recommended indexes for query performance
CREATE INDEX idx_trial_molecule ON ClinicalTrial(molecule);
CREATE INDEX idx_trial_condition ON ClinicalTrial(condition);
CREATE INDEX idx_trial_country ON ClinicalTrial(country);

CREATE INDEX idx_patent_molecule ON Patent(molecule);
CREATE INDEX idx_patent_jurisdiction ON Patent(jurisdiction);
CREATE INDEX idx_patent_expiry ON Patent(expiryDate);

CREATE INDEX idx_job_cachekey ON Job(cacheKey);
CREATE INDEX idx_job_status ON Job(status);
```

---

## Backend Implementation

### Entry Point: Server Setup

**File**: `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/env';
import queryRoutes from './routes/queryRoutes';
import reportRoutes from './routes/reportRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());              // Enable cross-origin requests
app.use(express.json());      // Parse JSON bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/query', queryRoutes);
app.use('/api/jobs', queryRoutes);
app.use('/api/jobs', reportRoutes);
app.use('/api/reports', reportRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### Configuration Management

**File**: `backend/src/config/env.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  geminiApiKey: process.env.GEMINI_API_KEY!,
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
};

// Validation
if (!config.geminiApiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
```

### Service Layer

#### 1. Gemini Client Service

**File**: `backend/src/services/geminiClient.ts`

```typescript
import axios from 'axios';
import { config } from '../config/env';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function callGemini(prompt: string, systemInstructions?: string): Promise<string> {
  const contents = [];
  
  // Add system instructions as conversation context
  if (systemInstructions) {
    contents.push({
      role: 'user',
      parts: [{ text: systemInstructions }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    });
  }
  
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await axios.post(
    `${GEMINI_API_URL}?key=${config.geminiApiKey}`,
    {
      contents,
      generationConfig: {
        temperature: 0.7,        // Balanced creativity/consistency
        maxOutputTokens: 2048,   // ~1500 words
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response text from Gemini');
  return text;
}

// Extract JSON from markdown code blocks
export function extractJson(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) return jsonMatch[1].trim();
  
  const objectMatch = text.match(/\{[\s\S]*\}/);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  
  if (objectMatch) return objectMatch[0];
  if (arrayMatch) return arrayMatch[0];
  
  return text.trim();
}
```

**Key Features**:
- Uses Gemini 2.5 Flash model (fast, cost-effective)
- System instructions via conversation priming
- JSON extraction handles markdown code blocks
- Temperature 0.7 balances creativity/consistency

#### 2. Job Service

**File**: `backend/src/services/jobService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { AgentTraceEvent } from '../types/agent';

const prisma = new PrismaClient();

export const jobService = {
  // Create new job
  async createJob(data: { queryText: string }) {
    return await prisma.job.create({
      data: {
        queryText: data.queryText,
        status: 'pending',
        trace: JSON.stringify([]),
      },
    });
  },

  // Update job status
  async updateJob(jobId: string, data: { status?: string; resultId?: string; cacheKey?: string }) {
    return await prisma.job.update({
      where: { id: jobId },
      data,
    });
  },

  // Append trace event (for real-time timeline)
  async appendTraceEvent(jobId: string, event: AgentTraceEvent) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    const trace = job.trace ? JSON.parse(job.trace) : [];
    trace.push(event);

    await prisma.job.update({
      where: { id: jobId },
      data: { trace: JSON.stringify(trace) },
    });
  },

  // Get job by ID
  async getJob(jobId: string) {
    return await prisma.job.findUnique({ where: { id: jobId } });
  },

  // Get trace events
  async getTrace(jobId: string): Promise<AgentTraceEvent[]> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return [];
    return job.trace ? JSON.parse(job.trace) : [];
  },
};
```

#### 3. Cache Service

**File**: `backend/src/services/cacheService.ts`

```typescript
import crypto from 'crypto';

interface CacheEntry {
  reportId: string;
  timestamp: number;
}

// In-memory cache (use Redis in production)
const cache = new Map<string, CacheEntry>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const cacheService = {
  createKey(queryText: string): string {
    return crypto.createHash('sha256').update(queryText.toLowerCase().trim()).digest('hex');
  },

  get(key: string): CacheEntry | null {
    const entry = cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }

    return entry;
  },

  set(key: string, value: { reportId: string }): void {
    cache.set(key, {
      reportId: value.reportId,
      timestamp: Date.now(),
    });
  },
};
```

**Caching Strategy**:
- Hash query text to create cache key
- 24-hour TTL (configurable)
- In-memory storage (use Redis for production)
- Cache hit returns existing report immediately

#### 4. Clinical Data Service

**File**: `backend/src/services/clinicalDataService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const clinicalDataService = {
  async findTrials(filters: {
    condition?: string;
    molecule?: string;
    country?: string;
    phase?: string;
  }) {
    const where: any = {};

    if (filters.condition) {
      where.condition = { contains: filters.condition, mode: 'insensitive' };
    }
    if (filters.molecule) {
      where.molecule = { equals: filters.molecule, mode: 'insensitive' };
    }
    if (filters.country) {
      where.country = { equals: filters.country, mode: 'insensitive' };
    }
    if (filters.phase) {
      where.phase = { equals: filters.phase, mode: 'insensitive' };
    }

    return await prisma.clinicalTrial.findMany({ where });
  },

  async getAllTrials() {
    return await prisma.clinicalTrial.findMany();
  },

  async getTrialsByMolecule(molecule: string) {
    return await prisma.clinicalTrial.findMany({
      where: { molecule: { equals: molecule, mode: 'insensitive' } },
    });
  },
};
```

#### 5. Patent Data Service

**File**: `backend/src/services/patentDataService.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const patentDataService = {
  async findPatents(filters: {
    molecule?: string;
    jurisdiction?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters.molecule) {
      where.molecule = { equals: filters.molecule, mode: 'insensitive' };
    }
    if (filters.jurisdiction) {
      where.jurisdiction = { equals: filters.jurisdiction, mode: 'insensitive' };
    }
    if (filters.status) {
      where.status = { equals: filters.status, mode: 'insensitive' };
    }

    return await prisma.patent.findMany({ where });
  },

  async getAllPatents() {
    return await prisma.patent.findMany();
  },

  async getPatentsByMolecule(molecule: string) {
    return await prisma.patent.findMany({
      where: { molecule: { equals: molecule, mode: 'insensitive' } },
    });
  },
};
```

#### 6. PDF Service

**File**: `backend/src/services/pdfService.ts`

Uses PDFKit to generate professional reports:

```typescript
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { ReportPayload } from '../types/report';

const REPORTS_DIR = path.join(__dirname, '../../reports');

class PdfService {
  async generatePdf(reportId: string, payload: ReportPayload): Promise<string> {
    const filePath = path.join(REPORTS_DIR, `${reportId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    
    doc.pipe(stream);

    // Title
    doc.fontSize(24).fillColor('#1a365d')
       .text('Pharmaceutical Intelligence Report', { align: 'center' });
    doc.moveDown();

    // Query
    doc.fontSize(12).fillColor('#4a5568').text('Query:', { underline: true });
    doc.fontSize(11).fillColor('#2d3748').text(payload.queryText);
    doc.moveDown();

    // Confidence Score
    doc.fontSize(14).fillColor('#1a365d')
       .text(`Overall Confidence: ${(payload.confidence * 100).toFixed(1)}%`);
    doc.moveDown();

    // Executive Summary
    doc.fontSize(14).fillColor('#1a365d').text('Executive Summary', { underline: true });
    doc.fontSize(11).fillColor('#2d3748').text(payload.summary);
    doc.moveDown(2);

    // Opportunities Table
    doc.fontSize(14).fillColor('#1a365d').text('Top Opportunities', { underline: true });
    payload.opportunities.forEach((opp, index) => {
      doc.fontSize(12).fillColor('#2b6cb0').text(`${index + 1}. ${opp.molecule}`);
      doc.fontSize(10).fillColor('#4a5568')
         .text(`   Rank: ${opp.rank} | Confidence: ${(opp.confidence * 100).toFixed(0)}% | FTO: ${opp.ftoFlag}`);
      doc.fontSize(10).fillColor('#718096').text(`   ${opp.rationale}`);
      doc.moveDown(0.5);
    });

    // ... (trials summary, patent landscape, recommendations)

    doc.end();
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }
}

export const pdfService = new PdfService();
```

---

## Agent System Deep Dive

### Agent Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MASTER AGENT                             │
│  1. Parse query with Gemini AI                                   │
│  2. Extract: condition, country, molecule, objectives            │
│  3. Create ExecutionPlan                                         │
│  4. Check cache (hash-based)                                     │
└────────────────┬─────────────────────────────────┬───────────────┘
                 │                                 │
                 ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   CLINICAL TRIALS AGENT      │   │      PATENT AGENT           │
│  1. Query trials DB          │   │  1. Query patents DB        │
│  2. Filter by plan params    │   │  2. Group by molecule       │
│  3. Group by molecule        │   │  3. Calculate FTO           │
│  4. Count phases, sponsors   │   │  4. Patent cliff analysis   │
│  5. Return MoleculeTrialData │   │  5. Return MoleculePatentData│
└────────────────┬─────────────┘   └─────────────────┬───────────┘
                 │                                   │
                 └──────────────┬────────────────────┘
                                ▼
               ┌─────────────────────────────────────────┐
               │        SYNTHESIS ENGINE                  │
               │  1. Merge clinical + patent data        │
               │  2. Calculate competitive analysis      │
               │  3. Detect licensing signals            │
               │  4. Calculate geo readiness             │
               │  5. Generate score breakdowns           │
               │  6. Rank molecules                      │
               └─────────────────┬───────────────────────┘
                                 ▼
               ┌─────────────────────────────────────────┐
               │       REPORT GENERATOR                   │
               │  1. Call Gemini for exec summary        │
               │  2. Generate recommendations            │
               │  3. Create PDF report                   │
               │  4. Store in DB                         │
               │  5. Return report ID                    │
               └─────────────────────────────────────────┘
```

### 1. Master Agent

**File**: `backend/src/agents/masterAgent.ts`

**Purpose**: Orchestrates the entire analysis workflow

**Key Functions**:

```typescript
export async function runMasterAgent(queryText: string, jobId: string): Promise<void> {
  // 1. Update job status
  await jobService.updateJob(jobId, { status: 'running' });

  // 2. Check cache
  const cacheKey = cacheService.createKey(queryText);
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    // Return cached report immediately
    await jobService.updateJob(jobId, {
      status: 'completed',
      resultId: cachedResult.reportId,
      cacheKey,
    });
    return;
  }

  // 3. Parse query with Gemini AI
  const planPrompt = `Parse this pharmaceutical query and extract structured parameters:

Query: "${queryText}"

Return JSON with:
- condition: disease/condition mentioned
- country: target country
- molecule: specific molecule if mentioned
- objectives: array of goals
- agentsToRun: always ["clinical", "patent"]`;

  let plan: ExecutionPlan = { agentsToRun: ['clinical', 'patent'] };
  
  try {
    const planResponse = await callGemini(planPrompt);
    const jsonStr = extractJson(planResponse);
    plan = JSON.parse(jsonStr);
  } catch (error) {
    // Fallback to heuristic parsing
    if (queryText.toLowerCase().includes('india')) plan.country = 'India';
    // ... more heuristics
  }

  // 4. Run agents in parallel
  const [clinicalResult, patentResult] = await Promise.all([
    runClinicalTrialsAgent(plan, jobId),
    runPatentAgent(plan, jobId),
  ]);

  // 5. Synthesize results
  const synthesisResult = await runSynthesisEngine(
    clinicalResult,
    patentResult,
    queryText,
    jobId
  );

  // 6. Generate report
  const reportId = await generateReport({
    jobId,
    queryText,
    opportunities: synthesisResult.opportunities,
    clinicalResult,
    patentResult,
    confidence: synthesisResult.overallConfidence,
    confidenceDecomposition: synthesisResult.confidenceDecomposition,
    marketInsights: synthesisResult.marketInsights,
    patentCliff: patentResult.patentCliff,
  });

  // 7. Cache result
  cacheService.set(cacheKey, { reportId });

  // 8. Mark job complete
  await jobService.updateJob(jobId, {
    status: 'completed',
    resultId: reportId,
  });
}
```

**Execution Plan Output**:

```typescript
interface ExecutionPlan {
  condition?: string;      // "respiratory", "cancer", "diabetes"
  country?: string;        // "India", "USA"
  molecule?: string;       // "Respimab-347"
  objectives?: string[];   // ["low competition", "high patient burden"]
  agentsToRun: string[];   // ["clinical", "patent"]
}
```

### 2. Clinical Trials Agent

**File**: `backend/src/agents/clinicalTrialsAgent.ts`

**Purpose**: Analyzes clinical trial data and aggregates by molecule

```typescript
export async function runClinicalTrialsAgent(
  plan: ExecutionPlan,
  jobId: string
): Promise<ClinicalAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'ClinicalTrialsAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Querying clinical trials database',
  });

  // Build filters
  const filters: any = {};
  if (plan.condition) filters.condition = plan.condition;
  if (plan.country) filters.country = plan.country;
  if (plan.molecule) filters.molecule = plan.molecule;

  // Query database
  const trials = await clinicalDataService.findTrials(filters);
  const allTrials = trials.length > 0 ? trials : await clinicalDataService.getAllTrials();

  // Group by molecule
  const moleculeMap = new Map<string, MoleculeTrialData>();

  for (const trial of allTrials) {
    const existing = moleculeMap.get(trial.molecule);
    if (existing) {
      existing.trialCount++;
      existing.phases[trial.phase] = (existing.phases[trial.phase] || 0) + 1;
      if (!existing.sponsors.includes(trial.sponsor)) {
        existing.sponsors.push(trial.sponsor);
      }
      if (!existing.citations.includes(trial.citations)) {
        existing.citations.push(trial.citations);
      }
      if (!existing.countries.includes(trial.country)) {
        existing.countries.push(trial.country);
      }
    } else {
      moleculeMap.set(trial.molecule, {
        molecule: trial.molecule,
        trialCount: 1,
        phases: { [trial.phase]: 1 },
        sponsors: [trial.sponsor],
        citations: [trial.citations],
        countries: [trial.country],
      });
    }
  }

  const byMolecule = Array.from(moleculeMap.values());

  await jobService.appendTraceEvent(jobId, {
    agent: 'ClinicalTrialsAgent',
    status: 'completed',
    timestamp: new Date().toISOString(),
    detail: `Processed ${allTrials.length} trials across ${byMolecule.length} molecules`,
  });

  return { byMolecule };
}
```

**Output Structure**:

```typescript
interface MoleculeTrialData {
  molecule: string;               // "Respimab-347"
  trialCount: number;             // 5
  phases: Record<string, number>; // {"Phase I": 2, "Phase II": 3}
  sponsors: string[];             // ["Pfizer", "Sun Pharma"]
  citations: string[];            // ["PMID:123", "PMID:456"]
  countries: string[];            // ["India", "USA"]
}
```

### 3. Patent Agent

**File**: `backend/src/agents/patentAgent.ts`

**Purpose**: Analyzes patent landscape and calculates FTO risk

**Key Features**:
1. **FTO Calculation**: Based on **latest** expiry date (most blocking patent)
2. **Patent Cliff Analysis**: Identifies upcoming expiries
3. **Jurisdiction Mapping**: Maps countries to patent jurisdictions

```typescript
export async function runPatentAgent(
  plan: ExecutionPlan,
  jobId: string
): Promise<PatentAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'PatentAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Querying patent database',
  });

  // Build filters
  const filters: any = {};
  if (plan.molecule) filters.molecule = plan.molecule;
  
  // Map country to jurisdiction
  if (plan.country) {
    const countryToJurisdiction: Record<string, string> = {
      'India': 'IN',
      'USA': 'US',
      'United States': 'US',
      'Europe': 'EP',
      'China': 'CN',
      'Japan': 'JP',
    };
    const jurisdiction = countryToJurisdiction[plan.country];
    if (jurisdiction) filters.jurisdiction = jurisdiction;
  }

  // Query database
  const patents = await patentDataService.findPatents(filters);
  const allPatents = patents.length > 0 ? patents : await patentDataService.getAllPatents();

  const now = new Date();
  
  // FTO calculation helper
  const calculateFto = (expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const diffYears = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (diffYears <= 0) return 'LOW';      // Expired - safe
    if (diffYears <= 3) return 'MEDIUM';   // Expiring soon
    return 'HIGH';                          // Blocked
  };
  
  // Years to expiry helper
  const calculateYearsToExpiry = (expiryDate: Date): number => {
    const diffYears = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return Math.round(diffYears * 10) / 10; // Round to 1 decimal
  };

  // Group by molecule
  const moleculeMap = new Map<string, {
    molecule: string;
    jurisdictions: string[];
    earliestExpiry: string;
    latestExpiry: Date;
    citations: string[];
  }>();

  for (const patent of allPatents) {
    const existing = moleculeMap.get(patent.molecule);
    const expiryDateObj = new Date(patent.expiryDate);
    const expiryDateStr = expiryDateObj.toISOString().split('T')[0];
    
    if (existing) {
      if (!existing.jurisdictions.includes(patent.jurisdiction)) {
        existing.jurisdictions.push(patent.jurisdiction);
      }
      // Track earliest for display
      if (expiryDateStr < existing.earliestExpiry) {
        existing.earliestExpiry = expiryDateStr;
      }
      // Track latest for FTO (most blocking patent)
      if (expiryDateObj > existing.latestExpiry) {
        existing.latestExpiry = expiryDateObj;
      }
      if (!existing.citations.includes(patent.citations)) {
        existing.citations.push(patent.citations);
      }
    } else {
      moleculeMap.set(patent.molecule, {
        molecule: patent.molecule,
        jurisdictions: [patent.jurisdiction],
        earliestExpiry: expiryDateStr,
        latestExpiry: expiryDateObj,
        citations: [patent.citations],
      });
    }
  }

  // Calculate FTO based on LATEST expiry
  const byMolecule: MoleculePatentData[] = Array.from(moleculeMap.values()).map(m => ({
    molecule: m.molecule,
    jurisdictions: m.jurisdictions,
    earliestExpiry: m.earliestExpiry,
    latestExpiry: m.latestExpiry.toISOString().split('T')[0],
    ftoFlag: calculateFto(m.latestExpiry),  // KEY: Use latest
    citations: m.citations,
    yearsToExpiry: calculateYearsToExpiry(m.latestExpiry),
  }));

  // Patent Cliff Radar
  const patentCliff: PatentCliffData = {
    alreadyExpired: [],
    expiring1Year: [],
    expiring3Years: [],
    expiring5Years: [],
  };

  for (const mol of byMolecule) {
    const entry: PatentCliffEntry = {
      molecule: mol.molecule,
      latestExpiry: mol.latestExpiry,
      jurisdictions: mol.jurisdictions,
      yearsToExpiry: mol.yearsToExpiry,
    };

    if (mol.yearsToExpiry <= 0) {
      patentCliff.alreadyExpired.push(entry);
    } else if (mol.yearsToExpiry <= 1) {
      patentCliff.expiring1Year.push(entry);
    } else if (mol.yearsToExpiry <= 3) {
      patentCliff.expiring3Years.push(entry);
    } else if (mol.yearsToExpiry <= 5) {
      patentCliff.expiring5Years.push(entry);
    }
  }

  await jobService.appendTraceEvent(jobId, {
    agent: 'PatentAgent',
    status: 'completed',
    timestamp: new Date().toISOString(),
    detail: `Analyzed ${allPatents.length} patents across ${byMolecule.length} molecules`,
  });

  return { byMolecule, patentCliff };
}
```

**Output Structure**:

```typescript
interface MoleculePatentData {
  molecule: string;          // "Respimab-347"
  jurisdictions: string[];   // ["IN", "US", "EP"]
  earliestExpiry: string;    // "2024-01-15" (for display)
  latestExpiry: string;      // "2028-06-20" (for FTO calculation)
  ftoFlag: 'LOW' | 'MEDIUM' | 'HIGH';
  citations: string[];       // ["US-PAT-12345", "EP-PAT-67890"]
  yearsToExpiry: number;     // 2.4 years
}

interface PatentCliffData {
  alreadyExpired: PatentCliffEntry[];   // Expired patents
  expiring1Year: PatentCliffEntry[];    // Expiring within 1 year
  expiring3Years: PatentCliffEntry[];   // Expiring within 3 years
  expiring5Years: PatentCliffEntry[];   // Expiring within 5 years
}
```

### 4. Synthesis Engine

**File**: `backend/src/agents/synthesisEngine.ts`

**Purpose**: Merges clinical and patent data with advanced analytics

**Advanced Analytics Functions**:

#### A. Competitive Intensity Calculator

```typescript
function calculateCompetitiveAnalysis(features: MoleculeFeatures): CompetitiveAnalysis {
  const sponsorCount = features.sponsors.length;
  const trialCount = features.trialCount;
  const jurisdictionCount = features.jurisdictions.length;
  
  // Competitive index (0-100)
  const indexScore = Math.min(100, Math.round(
    (sponsorCount * 15) + (trialCount * 10) + (jurisdictionCount * 5)
  ));
  
  let intensity: CompetitiveIntensity;
  if (indexScore < 30) {
    intensity = 'UNDERCROWDED';  // Low competition - opportunity!
  } else if (indexScore < 60) {
    intensity = 'COMPETITIVE';   // Moderate competition
  } else {
    intensity = 'SATURATED';     // High competition - avoid
  }
  
  return { intensity, sponsorCount, trialCount, jurisdictionCount, indexScore };
}
```

**Example Outputs**:
- **Respimab-347**: 2 sponsors, 3 trials, 2 jurisdictions → Index 65 → **SATURATED**
- **Novomab-123**: 1 sponsor, 1 trial, 1 jurisdiction → Index 25 → **UNDERCROWDED**

#### B. Licensing Signal Detector

```typescript
function calculateLicensingSignal(features: MoleculeFeatures): LicensingAnalysis {
  const phase2Trials = features.phases['Phase II'] || 0;
  const phase3Trials = features.phases['Phase III'] || 0;
  const sponsorDiversity = features.sponsors.length;
  const ftoFlag = features.ftoFlag;
  
  let signalScore = 0;
  const reasons: string[] = [];
  
  // Multiple Phase II trials = strong signal
  if (phase2Trials >= 2) {
    signalScore += 3;
    reasons.push(`${phase2Trials} Phase II trials showing active development`);
  }
  
  // No Phase III lock-in
  if (phase3Trials === 0) {
    signalScore += 2;
    reasons.push('No Phase III lock-in yet');
  }
  
  // Sponsor diversity = market interest
  if (sponsorDiversity >= 3) {
    signalScore += 2;
    reasons.push(`${sponsorDiversity} different sponsors showing interest`);
  }
  
  // FTO considerations
  if (ftoFlag === 'LOW') {
    signalScore += 2;
    reasons.push('LOW FTO risk - clear patent landscape');
  }
  
  let signal: LicensingSignal;
  if (signalScore >= 7) signal = 'STRONG';
  else if (signalScore >= 4) signal = 'MODERATE';
  else if (signalScore >= 2) signal = 'WEAK';
  else signal = 'NONE';
  
  return { signal, reasons, phase2Trials, phase3Trials, sponsorDiversity };
}
```

**Example Output**:
```json
{
  "signal": "STRONG",
  "reasons": [
    "3 Phase II trials showing active development",
    "No Phase III lock-in yet",
    "3 different sponsors showing interest",
    "LOW FTO risk - clear patent landscape"
  ],
  "phase2Trials": 3,
  "phase3Trials": 0,
  "sponsorDiversity": 3
}
```

#### C. Geographic Readiness Calculator

```typescript
function calculateGeoReadiness(features: MoleculeFeatures): GeoReadiness[] {
  const targetCountries = ['India', 'USA', 'China', 'Germany', 'Japan', 'UK'];
  
  return targetCountries.map(country => {
    const hasTrials = features.countries.includes(country);
    const jurisdiction = countryToJurisdiction[country]; // "India" → "IN"
    const hasFavorablePatent = 
      features.ftoFlag === 'LOW' || 
      (features.ftoFlag === 'MEDIUM' && !features.jurisdictions.includes(jurisdiction));
    
    const sponsorPresence = features.sponsors.some(s => 
      // Heuristic: Indian companies for India, etc.
      (country === 'India' && ['Sun Pharma', 'Cipla', 'Dr. Reddys'].some(c => s.includes(c)))
    );
    
    let readinessScore = 0;
    if (hasTrials) readinessScore += 0.4;
    if (hasFavorablePatent) readinessScore += 0.35;
    if (sponsorPresence) readinessScore += 0.25;
    
    return { country, readinessScore, hasTrials, hasFavorablePatent, sponsorPresence };
  });
}
```

**Example Output**:
```json
[
  {
    "country": "India",
    "readinessScore": 1.0,
    "hasTrials": true,
    "hasFavorablePatent": true,
    "sponsorPresence": true
  },
  {
    "country": "USA",
    "readinessScore": 0.4,
    "hasTrials": true,
    "hasFavorablePatent": false,
    "sponsorPresence": false
  }
]
```

#### D. Score Breakdown Calculator

```typescript
function calculateScoreBreakdown(
  features: MoleculeFeatures,
  licensingSignal: LicensingSignal
): ScoreBreakdown {
  const baseScore = 0.40;
  
  // Trial score: more trials = more validated
  const trialScore = Math.min(0.20, features.trialCount * 0.04);
  
  // FTO adjustment
  let ftoAdjustment = 0;
  if (features.ftoFlag === 'LOW') ftoAdjustment = 0.15;
  else if (features.ftoFlag === 'MEDIUM') ftoAdjustment = 0.05;
  else ftoAdjustment = -0.10;
  
  // Phase bonus
  let phaseBonus = 0;
  if (features.phases['Phase III']) phaseBonus += 0.10;
  if (features.phases['Phase II']) phaseBonus += 0.05;
  
  // Competition penalty
  const competitionPenalty = Math.min(0.15, features.sponsors.length * 0.02);
  
  // Licensing bonus
  let licensingBonus = 0;
  if (licensingSignal === 'STRONG') licensingBonus = 0.10;
  else if (licensingSignal === 'MODERATE') licensingBonus = 0.05;
  
  const total = Math.max(0.30, Math.min(0.95,
    baseScore + trialScore + ftoAdjustment + phaseBonus - competitionPenalty + licensingBonus
  ));
  
  return {
    baseScore,
    trialScore,
    ftoAdjustment,
    phaseBonus,
    competitionPenalty,
    licensingBonus,
    total,
  };
}
```

**Example Breakdown**:
```json
{
  "baseScore": 0.40,
  "trialScore": 0.12,      // 3 trials × 0.04
  "ftoAdjustment": 0.15,   // LOW FTO
  "phaseBonus": 0.15,      // Phase II + Phase III
  "competitionPenalty": -0.06,  // 3 sponsors × 0.02
  "licensingBonus": 0.10,  // STRONG licensing signal
  "total": 0.86            // 86% confidence
}
```

### 5. Report Generator

**File**: `backend/src/agents/reportGenerator.ts`

**Purpose**: Generates AI-powered reports and PDFs

```typescript
export async function generateReport(params: GenerateReportParams): Promise<string> {
  const { jobId, queryText, opportunities, clinicalResult, patentResult, confidence } = params;

  // 1. Generate executive summary with Gemini
  const summaryPrompt = `You are a pharmaceutical analyst. Write a concise executive summary (2-3 paragraphs):

Query: "${queryText}"

Top Opportunities:
${opportunities.slice(0, 3).map(o => `- ${o.molecule}: ${o.rationale}`).join('\n')}

Key Statistics:
- Molecules analyzed: ${new Set([...clinicalResult.byMolecule.map(m => m.molecule)]).size}
- Clinical trials: ${clinicalResult.byMolecule.reduce((sum, m) => sum + m.trialCount, 0)}
- Overall confidence: ${(confidence * 100).toFixed(0)}%`;

  const summary = await callGemini(summaryPrompt);

  // 2. Generate recommendations
  const recsPrompt = `Provide 3 actionable next steps as JSON array:
Query: "${queryText}"
Top opportunity: ${opportunities[0]?.molecule}

Return: ["Step 1...", "Step 2...", "Step 3..."]`;

  const recsResponse = await callGemini(recsPrompt);
  const recommendations = JSON.parse(extractJson(recsResponse));

  // 3. Generate suggested queries
  const suggestPrompt = `Suggest 3 follow-up queries as JSON array:
Query: "${queryText}"

Return: ["Query 1", "Query 2", "Query 3"]`;

  const suggestResponse = await callGemini(suggestPrompt);
  const suggestedQueries = JSON.parse(extractJson(suggestResponse));

  // 4. Create report payload
  const reportPayload: ReportPayload = {
    queryText,
    summary,
    opportunities,
    trialsSummary: clinicalResult,
    patentSummary: patentResult,
    confidence,
    recommendations,
    confidenceDecomposition: params.confidenceDecomposition,
    marketInsights: params.marketInsights,
    patentCliff: params.patentCliff,
    suggestedQueries,
  };

  // 5. Store in database
  const report = await prisma.report.create({
    data: {
      jobId,
      summary,
      confidence,
      data: JSON.stringify(reportPayload),
    },
  });

  // 6. Generate PDF
  const pdfPath = await pdfService.generatePdf(report.id, reportPayload);

  // 7. Update with PDF path
  await prisma.report.update({
    where: { id: report.id },
    data: { pdfPath },
  });

  return report.id;
}
```

---

## Advanced Analytics Features

### 1. Confidence Decomposition

**Purpose**: Explain how confidence scores are calculated for transparency

**Structure**:

```typescript
interface ConfidenceDecomposition {
  methodology: string;
  factors: Array<{
    factor: string;
    weight: number;
    contribution: number;
  }>;
  overallScore: number;
}
```

**Example**:

```json
{
  "methodology": "Multi-factor weighted scoring",
  "factors": [
    { "factor": "Clinical trial activity", "weight": 0.30, "contribution": 0.24 },
    { "factor": "FTO risk assessment", "weight": 0.25, "contribution": 0.21 },
    { "factor": "Phase progression", "weight": 0.20, "contribution": 0.15 },
    { "factor": "Competitive intensity", "weight": 0.15, "contribution": 0.12 },
    { "factor": "Licensing potential", "weight": 0.10, "contribution": 0.08 }
  ],
  "overallScore": 0.80
}
```

### 2. Market Insights

**Purpose**: High-level market intelligence metrics

**Structure**:

```typescript
interface MarketInsights {
  totalMoleculesAnalyzed: number;
  strongLicensingCandidates: number;
  undercrowdedOpportunities: number;
  avgCompetitionIndex: number;
  topTherapeuticAreas: Array<{ area: string; count: number }>;
}
```

**Example**:

```json
{
  "totalMoleculesAnalyzed": 33,
  "strongLicensingCandidates": 5,
  "undercrowdedOpportunities": 12,
  "avgCompetitionIndex": 42.3,
  "topTherapeuticAreas": [
    { "area": "Respiratory", "count": 15 },
    { "area": "Cardiovascular", "count": 8 },
    { "area": "Oncology", "count": 6 }
  ]
}
```

### 3. Patent Cliff Radar

**Purpose**: Track upcoming patent expiries for generic opportunities

**Structure**:

```typescript
interface PatentCliffData {
  alreadyExpired: PatentCliffEntry[];
  expiring1Year: PatentCliffEntry[];
  expiring3Years: PatentCliffEntry[];
  expiring5Years: PatentCliffEntry[];
}

interface PatentCliffEntry {
  molecule: string;
  latestExpiry: string;
  jurisdictions: string[];
  yearsToExpiry: number;
}
```

**Example**:

```json
{
  "expiring1Year": [
    { "molecule": "Cardionib-234", "latestExpiry": "2026-11-15", "jurisdictions": ["US"], "yearsToExpiry": 0.8 }
  ],
  "expiring3Years": [
    { "molecule": "Respimab-347", "latestExpiry": "2028-06-20", "jurisdictions": ["IN", "US"], "yearsToExpiry": 2.4 }
  ],
  "alreadyExpired": [
    { "molecule": "Respiflow-X", "latestExpiry": "2024-01-01", "jurisdictions": ["IN"], "yearsToExpiry": -2.0 }
  ]
}
```

---

## Frontend Implementation

### Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          App.tsx                                 │
│  - State management (jobId, trace, report, status)              │
│  - Polling logic (2-second interval)                             │
│  - API client integration                                        │
└────────────┬──────────────────────────────────┬──────────────────┘
             │                                  │
             ▼                                  ▼
┌──────────────────────┐            ┌──────────────────────────────┐
│    ChatInput.tsx     │            │     AgentTimeline.tsx         │
│  - Query input UI    │            │  - Real-time event display   │
│  - Submit handler    │            │  - Color-coded statuses      │
│  - Loading states    │            │  - Auto-scrolling            │
└──────────────────────┘            └──────────────────────────────┘
                                                 │
                                                 ▼
                                    ┌──────────────────────────────┐
                                    │      Dashboard.tsx           │
                                    │  - Report display            │
                                    │  - Opportunities table       │
                                    │  - Charts & visualizations   │
                                    │  - PDF download link         │
                                    └──────────────────────────────┘
```

### Main Application Component

**File**: `frontend/src/App.tsx`

```tsx
import { useState, useEffect } from 'react';
import { ChatInput } from './components/ChatInput';
import { AgentTimeline } from './components/AgentTimeline';
import { Dashboard } from './components/Dashboard';
import { api } from './api/client';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [trace, setTrace] = useState<AgentTraceEvent[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Polling logic
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'error') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const [status, traceData] = await Promise.all([
          api.getJobStatus(jobId),
          api.getTrace(jobId),
        ]);

        setJobStatus(status.status);
        setTrace(traceData);

        if (status.status === 'completed') {
          const reportData = await api.getReport(jobId);
          setReport(reportData);
          setIsLoading(false);
        } else if (status.status === 'error') {
          setError('Analysis failed. Please try again.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, jobStatus]);

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setTrace([]);

    try {
      const result = await api.createQuery(query);
      setJobId(result.jobId);
      setJobStatus(result.status);
    } catch (err) {
      setError('Failed to submit query. Make sure backend is running.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🧬 Pharmaceutical Intelligence Platform
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered drug discovery and market analysis
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input + Timeline */}
          <div className="lg:col-span-1">
            <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
            {trace.length > 0 && <AgentTimeline events={trace} />}
          </div>

          {/* Right: Dashboard */}
          <div className="lg:col-span-2">
            {error && <ErrorAlert message={error} />}
            {isLoading && !report && <LoadingState status={jobStatus} />}
            {report && <Dashboard report={report} />}
            {!isLoading && !report && !error && <EmptyState />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
```

### API Client

**File**: `frontend/src/api/client.ts`

```typescript
const API_BASE_URL = 'http://localhost:3001';

export const api = {
  async createQuery(queryText: string) {
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryText }),
    });
    return await response.json();
  },

  async getJobStatus(jobId: string) {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
    return await response.json();
  },

  async getTrace(jobId: string): Promise<AgentTraceEvent[]> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/trace`);
    return await response.json();
  },

  async getReport(jobId: string): Promise<ReportResponse> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/report`);
    return await response.json();
  },
};
```

### Dashboard Component (Enhanced)

**File**: `frontend/src/components/Dashboard.tsx`

**Key Features**:
- Expandable opportunity rows with score breakdowns
- Color-coded FTO risk, licensing signals, competitive intensity
- Patent cliff radar visualization
- Geographic readiness matrix
- PDF download link

```tsx
export const Dashboard: React.FC<DashboardProps> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900">Analysis Report</h2>
        <p className="text-gray-600 mt-1">{report.queryText}</p>
        <div className="mt-4 flex gap-4">
          <Badge>Confidence: {(report.confidence * 100).toFixed(0)}%</Badge>
          <Badge>{report.opportunities.length} Opportunities</Badge>
        </div>
      </div>

      {/* Executive Summary */}
      <Card title="Executive Summary">
        <p className="text-gray-700">{report.summary}</p>
      </Card>

      {/* Top Opportunities Table */}
      <Card title="Top Opportunities">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Molecule</th>
              <th>Confidence</th>
              <th>FTO Risk</th>
              <th>Licensing Signal</th>
              <th>Competition</th>
            </tr>
          </thead>
          <tbody>
            {report.opportunities.map(opp => (
              <OpportunityRow key={opp.rank} opportunity={opp} />
            ))}
          </tbody>
        </table>
      </Card>

      {/* Patent Cliff Radar */}
      {report.patentCliff && (
        <Card title="Patent Cliff Radar">
          <PatentCliffChart data={report.patentCliff} />
        </Card>
      )}

      {/* Geographic Readiness */}
      {report.opportunities[0]?.geoReadiness && (
        <Card title="Geographic Market Readiness">
          <GeoReadinessMatrix data={report.opportunities[0].geoReadiness} />
        </Card>
      )}

      {/* Recommendations */}
      <Card title="Strategic Recommendations">
        <ol className="list-decimal list-inside space-y-2">
          {report.recommendations.map((rec, i) => (
            <li key={i} className="text-gray-700">{rec}</li>
          ))}
        </ol>
      </Card>

      {/* PDF Download */}
      <div className="text-center">
        <a
          href={report.pdfUrl}
          download
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          📄 Download PDF Report
        </a>
      </div>
    </div>
  );
};
```

---

## API Reference

### Endpoints

#### POST `/api/query`

**Purpose**: Submit a new analysis query

**Request**:
```json
{
  "queryText": "Find respiratory molecules with low patent risk in India"
}
```

**Response** (201 Created):
```json
{
  "jobId": "clk123abc...",
  "status": "pending"
}
```

**Errors**:
- 400: Invalid request body
- 500: Server error

---

#### GET `/api/jobs/:id`

**Purpose**: Get job status

**Response** (200 OK):
```json
{
  "id": "clk123abc...",
  "status": "completed",
  "queryText": "Find respiratory molecules...",
  "resultId": "clk456def...",
  "createdAt": "2026-01-31T10:30:00Z",
  "updatedAt": "2026-01-31T10:31:45Z"
}
```

**Status Values**:
- `pending`: Job queued
- `running`: Analysis in progress
- `completed`: Report generated
- `error`: Failed

---

#### GET `/api/jobs/:id/trace`

**Purpose**: Get real-time agent execution trace

**Response** (200 OK):
```json
[
  {
    "agent": "MasterAgent",
    "status": "running",
    "timestamp": "2026-01-31T10:30:01Z",
    "detail": "Parsing query with AI"
  },
  {
    "agent": "ClinicalTrialsAgent",
    "status": "running",
    "timestamp": "2026-01-31T10:30:05Z",
    "detail": "Querying clinical trials database"
  },
  {
    "agent": "ClinicalTrialsAgent",
    "status": "completed",
    "timestamp": "2026-01-31T10:30:08Z",
    "detail": "Processed 45 trials across 12 molecules"
  }
]
```

---

#### GET `/api/jobs/:id/report`

**Purpose**: Get full analysis report

**Response** (200 OK):
```json
{
  "reportId": "clk789ghi...",
  "queryText": "Find respiratory molecules...",
  "summary": "Analysis of 33 molecules identified...",
  "confidence": 0.85,
  "opportunities": [
    {
      "molecule": "Respimab-347",
      "rank": 1,
      "confidence": 0.92,
      "ftoFlag": "LOW",
      "rationale": "Strong Phase II activity with expired patents",
      "scoreBreakdown": { "baseScore": 0.40, "trialScore": 0.12, ... },
      "competitiveAnalysis": { "intensity": "UNDERCROWDED", ... },
      "licensingAnalysis": { "signal": "STRONG", ... },
      "geoReadiness": [...]
    }
  ],
  "trialsSummary": { "byMolecule": [...] },
  "patentSummary": { "byMolecule": [...], "patentCliff": {...} },
  "recommendations": ["Prioritize Respimab-347...", ...],
  "confidenceDecomposition": {...},
  "marketInsights": {...},
  "patentCliff": {...},
  "suggestedQueries": ["Compare top 3 molecules", ...],
  "pdfUrl": "/api/reports/clk789ghi.../pdf",
  "createdAt": "2026-01-31T10:31:45Z"
}
```

---

#### GET `/api/reports/:id/pdf`

**Purpose**: Download PDF report

**Response** (200 OK):
- Content-Type: `application/pdf`
- Binary PDF file download

---

## Setup & Deployment

### Prerequisites

- **Node.js**: 20.19+ or 22.12+
- **npm**: 10+ or **yarn**: 1.22+
- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation Steps

#### 1. Clone & Install Dependencies

```powershell
# Navigate to project
cd ey-techathon-pharmaceutical

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 2. Configure Environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your-api-key-here
DATABASE_URL="file:./dev.db"
PORT=3001
```

#### 3. Setup Database

```powershell
cd backend

# Run Prisma migrations
npx prisma migrate dev

# Seed database with synthetic data
npx prisma db seed

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

#### 4. Start Development Servers

**Terminal 1 (Backend)**:
```powershell
cd backend
npm run dev
```

**Terminal 2 (Frontend)**:
```powershell
cd frontend
npm run dev
```

#### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (if running)

### Quick Start Script

Alternatively, use the provided PowerShell script:

```powershell
# From project root
.\start.ps1
```

This script:
1. Installs dependencies
2. Sets up database
3. Starts both servers concurrently

---

## Example Usage Scenarios

### Scenario 1: Generic Development Opportunity

**Query**: `"Find molecules with expired patents suitable for generic development"`

**Expected Flow**:
1. Master Agent parses query → no specific condition/country
2. Clinical Agent returns all trials
3. Patent Agent filters for expired patents (FTO = LOW)
4. Synthesis Engine ranks by trial count + FTO score
5. Report highlights "Respiflow-X" (expired 2024, Phase III)

**Key Metrics**:
- Confidence: ~88%
- Top opportunities: 10+ molecules with expired patents
- Licensing signal: MODERATE (proven but not crowded)

---

### Scenario 2: India Market Entry

**Query**: `"Find respiratory molecules with low patent risk in India"`

**Expected Flow**:
1. Master Agent extracts: condition="respiratory", country="India"
2. Clinical Agent filters: condition contains "COPD" or "Asthma", country="India"
3. Patent Agent filters: jurisdiction="IN", calculates FTO
4. Synthesis Engine prioritizes:
   - Indian sponsor presence
   - LOW FTO in India
   - Trial activity in India
5. Report highlights "Respimab-IN" (2 trials, expired IN patent)

**Key Metrics**:
- Confidence: ~85%
- Geographic readiness (India): 1.0/1.0
- Competitive intensity: UNDERCROWDED
- Licensing signal: STRONG

---

### Scenario 3: Licensing Candidate Discovery

**Query**: `"Show Phase II trials with LOW patent risk that could be licensing candidates"`

**Expected Flow**:
1. Master Agent extracts: phase="Phase II", objective="licensing"
2. Clinical Agent filters: phase="Phase II"
3. Patent Agent calculates FTO for all
4. Synthesis Engine applies licensing detector:
   - Multiple Phase II trials
   - No Phase III lock-in
   - Sponsor diversity
   - LOW FTO
5. Report prioritizes molecules matching all criteria

**Key Metrics**:
- Licensing signal: STRONG for top 3 candidates
- Confidence: ~80-90%
- Recommendations: "Initiate licensing discussions with..."

---

### Scenario 4: Patent Cliff Analysis

**Query**: `"Analyze molecules with patents expiring in next 3 years"`

**Expected Flow**:
1. Master Agent extracts: objective="patent expiry"
2. Patent Agent filters: yearsToExpiry <= 3
3. Synthesis Engine sorts by expiry date
4. Report Generator creates patent cliff radar
5. Dashboard visualizes expiry timeline

**Key Metrics**:
- Patent Cliff Radar:
  - Expiring in 1 year: 5 molecules
  - Expiring in 3 years: 12 molecules
- Generic opportunity score: HIGH
- Recommendations: "Prepare generic development pipeline..."

---

## Key Design Decisions

### 1. FTO Calculation Based on Latest Expiry

**Rationale**: If a molecule has patents expiring in 2024 (IN) and 2030 (US), FTO should be MEDIUM (blocked in US), not LOW.

**Implementation**: Track both earliest (for display) and latest (for FTO calculation).

---

### 2. Shared Molecule Pool

**Rationale**: Real-world molecules appear in both clinical trials and patent databases.

**Implementation**: Generate 30 shared molecules upfront, use for both datasets.

---

### 3. In-Memory Cache

**Rationale**: Identical queries return instantly without re-running analysis.

**Trade-off**: Use Redis for production to share cache across server instances.

---

### 4. Parallel Agent Execution

**Rationale**: Clinical and Patent agents have no dependencies, run concurrently.

**Benefit**: ~50% faster than sequential execution.

---

### 5. Real-Time Trace Logging

**Rationale**: Users want visibility into multi-step AI analysis.

**Implementation**: Store JSON array of trace events, poll every 2 seconds.

---

## Conclusion

This documentation provides a complete reference for the Pharmaceutical Intelligence Platform, covering:
- ✅ Synthetic dataset generation logic (206 records)
- ✅ Database schema and relationships
- ✅ Multi-agent system architecture
- ✅ Advanced analytics algorithms
- ✅ Frontend implementation details
- ✅ API specifications
- ✅ Setup and deployment instructions

The platform demonstrates how AI (Gemini) can be combined with synthetic data and sophisticated algorithms to create a realistic pharmaceutical market intelligence tool.
