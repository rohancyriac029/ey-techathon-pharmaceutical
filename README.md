# Pharmaceutical Intelligence Platform

AI-powered drug discovery and market analysis system using Gemini API, React, and Node.js.

## Architecture

**Backend (Node + TypeScript)**
- Express REST API
- Prisma ORM with SQLite database
- Gemini AI integration for intelligent analysis
- Multi-agent orchestration system
- PDF report generation

**Frontend (React + TypeScript)**
- Vite + React + Tailwind CSS
- Real-time agent orchestration visualization
- Interactive dashboard with opportunities analysis
- PDF report download

## Getting Started

### Prerequisites
- Node.js v20.18+
- npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. The database is already set up with:
   - Schema migrated
   - Seed data loaded (103 clinical trials + 103 patents)
   - Demo scenarios for testing

4. Start the backend server:
```bash
npm run dev
```

Backend will run on: http://localhost:3001

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Dependencies are already installed

3. Start the development server:
```bash
npm run dev
```

Frontend will run on: http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Enter a natural language query, for example:
   - "Find molecules with low competition but high patient burden in respiratory disease in India"
   - "Identify COPD treatments with expiring patents in India"
   - "Analyze opportunities for Respiflow-X"

3. Watch the agent orchestration in real-time:
   - MasterAgent parses your query
   - ClinicalTrialsAgent searches trial data
   - PatentAgent analyzes patent landscape
   - SynthesisEngine ranks opportunities
   - ReportGenerator creates comprehensive reports

4. Review results:
   - Overall confidence score
   - Top molecule opportunities
   - Clinical trials distribution
   - Patent FTO risk analysis
   - Download full PDF report

## Demo Scenarios

The seed data includes 3 pre-configured scenarios:

1. **Respiflow-X** (Golden Opportunity)
   - COPD treatment
   - Phase III trials in India
   - Expired/expiring patents (LOW FTO risk)
   - Perfect for low competition queries

2. **OncoBlock-99** (Blocked Path)
   - Cancer treatment
   - Active trials but HIGH patent risk
   - Patents valid until 2038
   - Shows FTO risk analysis

3. **Respimab-IN** (India Focus)
   - Multiple respiratory indications
   - Indian trials and expired patents
   - Great for India-specific queries

## API Endpoints

- `POST /api/query` - Submit analysis query
- `GET /api/jobs/:id` - Get job status
- `GET /api/jobs/:id/trace` - Get agent execution trace
- `GET /api/jobs/:id/report` - Get report JSON
- `GET /api/reports/:id/pdf` - Download PDF report

## Tech Stack

### Backend
- TypeScript
- Express
- Prisma (SQLite)
- Gemini AI API
- PDFKit
- Zod (validation)

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- TanStack Query

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data script
│   └── dev.db                 # SQLite database
├── src/
│   ├── agents/                # AI agents
│   │   ├── masterAgent.ts
│   │   ├── clinicalTrialsAgent.ts
│   │   ├── patentAgent.ts
│   │   ├── synthesisEngine.ts
│   │   └── reportGenerator.ts
│   ├── services/              # Core services
│   │   ├── cacheService.ts
│   │   ├── geminiClient.ts
│   │   ├── jobService.ts
│   │   ├── clinicalDataService.ts
│   │   ├── patentDataService.ts
│   │   └── pdfService.ts
│   ├── routes/                # API routes
│   ├── types/                 # TypeScript types
│   └── index.ts               # Express server
└── reports/                   # Generated PDF reports

frontend/
├── src/
│   ├── api/
│   │   └── client.ts          # API client
│   ├── components/
│   │   ├── ChatInput.tsx
│   │   ├── AgentTimeline.tsx
│   │   └── Dashboard.tsx
│   └── App.tsx                # Main application
└── tailwind.config.js
```

## Features

✅ Natural language query parsing with Gemini AI
✅ Multi-agent orchestration system
✅ Real-time execution trace visualization
✅ Intelligent molecule ranking and scoring
✅ FTO (Freedom to Operate) risk analysis
✅ Clinical trials database analysis
✅ Patent landscape assessment
✅ PDF report generation
✅ In-memory caching for performance
✅ SQLite database (no external DB required)
✅ Responsive UI with Tailwind CSS
✅ TypeScript end-to-end

## License

ISC
