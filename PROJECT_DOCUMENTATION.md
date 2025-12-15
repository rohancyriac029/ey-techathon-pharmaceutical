# Pharmaceutical Intelligence Platform

## Overview

A multi-agent AI system for pharmaceutical market intelligence, combining clinical trial analysis, patent landscape assessment, and strategic recommendations powered by Google Gemini AI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    React + Vite + Tailwind                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  ChatInput   │  │ AgentTimeline│  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                  Node.js + Express + TypeScript                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     MASTER AGENT                          │  │
│  │  Orchestrates query parsing and agent coordination        │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
│  │  Clinical   │    │   Patent    │    │    Synthesis    │     │
│  │   Agent     │    │   Agent     │    │     Engine      │     │
│  └─────────────┘    └─────────────┘    └─────────────────┘     │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────┐                         │
│                    │ Report Generator│                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                    SQLite + Prisma ORM                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Job    │  │  Report  │  │ Clinical │  │  Patent  │       │
│  │          │  │          │  │  Trial   │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 7, Tailwind CSS 4, TypeScript |
| Backend | Node.js, Express 4, TypeScript |
| Database | SQLite with Prisma ORM |
| AI | Google Gemini 2.5 Flash |
| PDF Generation | PDFKit |

---

## Database Schema

### Job
Tracks query processing status and results.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `queryText` | String | Original user query |
| `status` | Enum | `pending`, `processing`, `completed`, `failed` |
| `trace` | JSON | Array of agent trace events |
| `resultId` | String? | Reference to generated Report |
| `createdAt` | DateTime | Job creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### Report
Stores generated analysis reports.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `queryText` | String | Original query |
| `summary` | String | Executive summary (AI-generated) |
| `confidence` | Float | Overall confidence score (0-1) |
| `opportunities` | JSON | Ranked molecule opportunities |
| `trialsSummary` | JSON | Clinical trials analysis |
| `patentSummary` | JSON | Patent landscape analysis |
| `recommendations` | JSON | Strategic recommendations |
| `pdfPath` | String? | Path to generated PDF |
| `createdAt` | DateTime | Report creation timestamp |

### ClinicalTrial
Mock clinical trial data.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Auto-increment primary key |
| `condition` | String | Disease/condition being studied |
| `molecule` | String | Drug molecule name |
| `phase` | String | Trial phase (I, II, III, IV) |
| `sponsor` | String | Sponsoring organization |
| `country` | String | Trial location country |
| `citations` | String | Reference citations (PMID) |

### Patent
Mock patent data.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Int | Auto-increment primary key |
| `molecule` | String | Drug molecule name |
| `jurisdiction` | String | Patent jurisdiction (US, IN, EP, etc.) |
| `status` | String | `Active` or `Expired` |
| `expiryDate` | DateTime | Patent expiration date |
| `ftoFlag` | String | Freedom-to-Operate flag |
| `citations` | String | Patent reference numbers |

---

## API Endpoints

### POST `/api/query`
Submit a new analysis query.

**Request:**
```json
{
  "queryText": "Find respiratory molecules with low patent risk in India"
}
```

**Response:**
```json
{
  "jobId": "uuid-string",
  "message": "Query submitted successfully"
}
```

### GET `/api/jobs/:id`
Get job status.

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "queryText": "...",
  "resultId": "report-uuid",
  "createdAt": "2025-12-09T...",
  "updatedAt": "2025-12-09T..."
}
```

### GET `/api/jobs/:id/trace`
Get real-time agent execution trace.

**Response:**
```json
[
  {
    "agent": "MasterAgent",
    "status": "running",
    "timestamp": "2025-12-09T14:30:00Z",
    "detail": "Parsing query intent"
  },
  {
    "agent": "ClinicalTrialsAgent",
    "status": "completed",
    "timestamp": "2025-12-09T14:30:05Z",
    "detail": "Found 45 trials across 12 molecules"
  }
]
```

### GET `/api/jobs/:id/report`
Get the full analysis report.

**Response:**
```json
{
  "reportId": "uuid",
  "queryText": "...",
  "summary": "Executive summary text...",
  "confidence": 0.85,
  "opportunities": [...],
  "trialsSummary": {...},
  "patentSummary": {...},
  "recommendations": [...],
  "pdfUrl": "/api/reports/uuid/pdf",
  "createdAt": "..."
}
```

### GET `/api/reports/:id/pdf`
Download the PDF report.

---

## Agent System

### 1. Master Agent (`masterAgent.ts`)

**Purpose:** Orchestrates the entire analysis workflow.

**Functions:**
- `runMasterAgent(queryText: string, jobId: string): Promise<Report>`
  - Parses user query using Gemini AI
  - Extracts intent, molecule, phase, country filters
  - Coordinates sub-agents in parallel
  - Manages job status and trace logging

**Query Parsing Output:**
```typescript
interface ExecutionPlan {
  molecule?: string;      // Specific molecule filter
  phase?: string;         // Trial phase filter
  country?: string;       // Geographic filter
  intent: string;         // Query intent classification
}
```

### 2. Clinical Trials Agent (`clinicalTrialsAgent.ts`)

**Purpose:** Analyzes clinical trial data.

**Functions:**
- `runClinicalAgent(plan: ExecutionPlan, jobId: string): Promise<ClinicalAgentResult>`
  - Queries trial database with filters
  - Groups trials by molecule
  - Counts phases and sponsors
  - Returns aggregated trial data

**Output:**
```typescript
interface MoleculeTrialData {
  molecule: string;
  trialCount: number;
  phases: Record<string, number>;  // e.g., {"Phase I": 2, "Phase II": 3}
  sponsors: string[];
  citations: string[];
}
```

### 3. Patent Agent (`patentAgent.ts`)

**Purpose:** Analyzes patent landscape and calculates FTO risk.

**Functions:**
- `runPatentAgent(plan: ExecutionPlan, jobId: string): Promise<PatentAgentResult>`
  - Queries patent database
  - Groups patents by molecule
  - Calculates FTO based on **latest** expiry date (most blocking patent)

**FTO Calculation Logic:**
```typescript
const calculateFto = (latestExpiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' => {
  const now = new Date();
  const diffYears = (expiryDate - now) / (365 days);
  
  if (diffYears <= 0) return 'LOW';      // Expired - safe to develop
  if (diffYears <= 3) return 'MEDIUM';   // Expiring soon - proceed with caution
  return 'HIGH';                          // Active - blocked
};
```

**Output:**
```typescript
interface MoleculePatentData {
  molecule: string;
  jurisdictions: string[];     // e.g., ["US", "IN", "EP"]
  earliestExpiry: string;      // For display
  latestExpiry: string;        // Used for FTO calculation
  ftoFlag: 'LOW' | 'MEDIUM' | 'HIGH';
  citations: string[];
}
```

### 4. Synthesis Engine (`synthesisEngine.ts`)

**Purpose:** Ranks molecules and calculates confidence scores.

**Functions:**
- `synthesizeResults(trialsData, patentData, jobId): Promise<RankedOpportunity[]>`
  - Merges clinical and patent data
  - Applies multi-factor scoring algorithm
  - Ranks molecules by opportunity score

**Scoring Algorithm:**
```typescript
// Base confidence from trial activity
let confidence = 0.5 + (trialCount * 0.05);

// FTO adjustments
if (ftoFlag === 'LOW') confidence += 0.15;
if (ftoFlag === 'MEDIUM') confidence += 0.05;
if (ftoFlag === 'HIGH') confidence -= 0.10;

// Phase progression bonus
if (phases['Phase III']) confidence += 0.10;
if (phases['Phase II']) confidence += 0.05;

// Competition penalty
const competitionScore = sponsors.length / 10;
confidence -= competitionScore * 0.05;

// Clamp to 0-1 range
confidence = Math.max(0.3, Math.min(0.95, confidence));
```

**Output:**
```typescript
interface RankedOpportunity {
  molecule: string;
  rank: number;
  confidence: number;
  ftoFlag: string;
  rationale: string;
}
```

### 5. Report Generator (`reportGenerator.ts`)

**Purpose:** Generates final reports with AI summaries.

**Functions:**
- `generateReport(query, trials, patents, ranked, jobId): Promise<Report>`
  - Calls Gemini AI for executive summary
  - Generates strategic recommendations
  - Creates PDF report
  - Stores report in database

---

## Services

### Cache Service (`cacheService.ts`)

**Purpose:** Prevents redundant processing of identical queries.

**Functions:**
- `getCachedResult(queryHash: string): Promise<Job | null>`
- `cacheResult(queryHash: string, jobId: string): Promise<void>`

**Behavior:**
- Hashes query text to create cache key
- Returns existing completed job if found
- 24-hour cache TTL (configurable)

### Clinical Data Service (`clinicalDataService.ts`)

**Purpose:** Database access layer for clinical trials.

**Functions:**
- `findTrials(filters: TrialFilters): Promise<ClinicalTrial[]>`
- `getAllTrials(): Promise<ClinicalTrial[]>`
- `getTrialsByMolecule(molecule: string): Promise<ClinicalTrial[]>`

### Patent Data Service (`patentDataService.ts`)

**Purpose:** Database access layer for patents.

**Functions:**
- `findPatents(filters: PatentFilters): Promise<Patent[]>`
- `getAllPatents(): Promise<Patent[]>`
- `getPatentsByMolecule(molecule: string): Promise<Patent[]>`

### Gemini Client (`geminiClient.ts`)

**Purpose:** Interface to Google Gemini AI API.

**Functions:**
- `callGemini(prompt: string, systemInstructions?: string): Promise<string>`

**Configuration:**
- Model: `gemini-2.5-flash`
- Temperature: 0.7
- Max tokens: 2048

### Job Service (`jobService.ts`)

**Purpose:** Job lifecycle management.

**Functions:**
- `createJob(queryText: string): Promise<Job>`
- `updateJobStatus(jobId: string, status: JobStatus): Promise<void>`
- `appendTraceEvent(jobId: string, event: TraceEvent): Promise<void>`
- `getJob(jobId: string): Promise<Job>`
- `setJobResult(jobId: string, reportId: string): Promise<void>`

### PDF Service (`pdfService.ts`)

**Purpose:** PDF report generation using PDFKit.

**Functions:**
- `generatePdfReport(report: Report): Promise<string>`
  - Creates professional PDF layout
  - Includes executive summary, opportunities table, charts
  - Returns file path

---

## Frontend Components

### App.tsx
Main application container managing state flow.

**State:**
```typescript
const [jobId, setJobId] = useState<string | null>(null);
const [trace, setTrace] = useState<AgentTraceEvent[]>([]);
const [report, setReport] = useState<ReportResponse | null>(null);
const [status, setStatus] = useState<'idle' | 'loading' | 'complete'>('idle');
```

**Polling Logic:**
- Polls `/api/jobs/:id` every 1 second while processing
- Fetches trace events for real-time timeline updates
- Fetches report when job completes

### ChatInput.tsx
Query input interface.

**Props:**
```typescript
interface ChatInputProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}
```

**Features:**
- Text input with submit button
- Disabled state during processing
- Enter key submission

### AgentTimeline.tsx
Real-time agent execution visualization.

**Props:**
```typescript
interface AgentTimelineProps {
  events: AgentTraceEvent[];
}
```

**Features:**
- Color-coded status indicators (pending, running, completed, error)
- Timestamp display
- Agent detail messages
- Auto-scrolling

### Dashboard.tsx
Final report display.

**Props:**
```typescript
interface DashboardProps {
  report: ReportResponse;
}
```

**Sections:**
1. **Header Card** - Query, confidence, opportunities count
2. **Executive Summary** - AI-generated analysis
3. **Top Opportunities Table** - Ranked molecules with scores
4. **Clinical Trials Overview** - Trial counts by molecule
5. **Patent Landscape** - FTO flags with expiry dates
6. **Recommendations** - Strategic next steps
7. **PDF Download** - Link to full report

---

## Data Flow

```
1. User submits query via ChatInput
        │
        ▼
2. POST /api/query creates Job (status: pending)
        │
        ▼
3. MasterAgent starts (status: processing)
   ├── Parses query with Gemini AI
   └── Creates ExecutionPlan
        │
        ▼
4. Sub-agents run in parallel
   ├── ClinicalTrialsAgent → queries trials DB
   └── PatentAgent → queries patents DB, calculates FTO
        │
        ▼
5. SynthesisEngine merges results
   └── Ranks molecules by opportunity score
        │
        ▼
6. ReportGenerator creates report
   ├── Calls Gemini for executive summary
   ├── Generates recommendations
   ├── Creates PDF
   └── Stores in database
        │
        ▼
7. Job marked complete, resultId set
        │
        ▼
8. Frontend polls, receives report
        │
        ▼
9. Dashboard displays results
```

---

## Mock Data

The database is seeded with:

### Demo Scenarios
1. **Respiflow-X** - "Golden Opportunity" (Phase III, LOW FTO, expired 2024)
2. **OncoBlock-99** - "Blocked Path" (Phase II, HIGH FTO, expires 2038)
3. **Respimab-IN** - "India Focus" (Phase I/II, LOW FTO, expired 2022)

### Synthetic Volume Data
- **100 Clinical Trials** - Random molecules, phases, sponsors, countries
- **100 Patents** - Random expiry dates (2020-2040), jurisdictions

### Data Pools
- **Conditions:** COPD, Asthma, Type 2 Diabetes, Hypertension, etc.
- **Molecules:** Combinations of prefixes (Respi, Cardio, Onco) + suffixes (vir, mab, nib)
- **Phases:** Phase I, II, III, IV
- **Sponsors:** Pfizer, Novartis, Sun Pharma, Cipla, etc.
- **Countries:** India, USA, China, Germany, Japan, UK
- **Jurisdictions:** IN, US, EP, WO

---

## Configuration

### Environment Variables (`.env`)

```env
GEMINI_API_KEY=your-api-key-here
DATABASE_URL="file:./dev.db"
PORT=3001
```

### Package Scripts

**Backend (`backend/package.json`):**
```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio"
}
```

**Frontend (`frontend/package.json`):**
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

---

## Running the Application

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn

### Setup

```powershell
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup database
cd backend
npx prisma migrate dev
npx prisma db seed

# Start servers
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

### URLs
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **Prisma Studio:** `npx prisma studio` (http://localhost:5555)

---

## Example Queries

```
Find respiratory molecules with low patent risk in India

Show Phase II trials for diabetes with licensing opportunities

Find molecules in Phase II trials with LOW patent risk that could be 
licensing candidates for a mid-size pharmaceutical company entering India

Analyze oncology molecules with expired patents suitable for generic development

What are the best licensing opportunities for COPD treatments?
```

---

## File Structure

```
eytechpharmaceu/
├── package.json
├── README.md
├── start.ps1
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   ├── reports/              # Generated PDF reports
│   │
│   └── src/
│       ├── index.ts          # Express server entry
│       │
│       ├── agents/
│       │   ├── masterAgent.ts
│       │   ├── clinicalTrialsAgent.ts
│       │   ├── patentAgent.ts
│       │   ├── synthesisEngine.ts
│       │   └── reportGenerator.ts
│       │
│       ├── config/
│       │   └── env.ts
│       │
│       ├── routes/
│       │   ├── queryRoutes.ts
│       │   └── reportRoutes.ts
│       │
│       ├── services/
│       │   ├── cacheService.ts
│       │   ├── clinicalDataService.ts
│       │   ├── geminiClient.ts
│       │   ├── jobService.ts
│       │   ├── patentDataService.ts
│       │   └── pdfService.ts
│       │
│       └── types/
│           ├── agent.ts
│           ├── query.ts
│           └── report.ts
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── index.html
    │
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── App.css
        ├── index.css
        │
        ├── api/
        │   └── client.ts
        │
        └── components/
            ├── ChatInput.tsx
            ├── AgentTimeline.tsx
            └── Dashboard.tsx
```

---

## Key Design Decisions

1. **FTO Based on Latest Expiry:** If a molecule has multiple patents, FTO is calculated from the latest (most blocking) expiry date, not the earliest.

2. **Graceful AI Fallback:** If Gemini API fails or returns unparseable JSON, the system falls back to heuristic ranking algorithms.

3. **Query Caching:** Identical queries return cached results to avoid redundant processing.

4. **Real-time Trace:** Agent execution is logged in real-time, enabling the timeline visualization.

5. **Parallel Agent Execution:** Clinical and Patent agents run in parallel for faster processing.

6. **Multi-factor Scoring:** Confidence scores consider trial count, phases, FTO risk, and competition level.
