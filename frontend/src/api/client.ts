import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AgentTraceEvent {
  agent: string;
  status: string;
  timestamp: string;
  detail?: string;
}

// Score Breakdown for Explainability
export interface ScoreBreakdown {
  baseScore: number;
  trialScore: number;
  ftoAdjustment: number;
  phaseBonus: number;
  competitionPenalty: number;
  licensingBonus: number;
  total: number;
}

// Competitive Analysis
export type CompetitiveIntensity = 'UNDERCROWDED' | 'COMPETITIVE' | 'SATURATED';

export interface CompetitiveAnalysis {
  intensity: CompetitiveIntensity;
  sponsorCount: number;
  trialCount: number;
  jurisdictionCount: number;
  indexScore: number;
}

// Licensing Analysis
export type LicensingSignal = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

export interface LicensingAnalysis {
  signal: LicensingSignal;
  reasons: string[];
  phase2Trials: number;
  phase3Trials: number;
  sponsorDiversity: number;
}

// Geographic Readiness
export interface GeoReadiness {
  country: string;
  readinessScore: number;
  hasTrials: boolean;
  hasFavorablePatent: boolean;
  sponsorPresence: boolean;
}

// Enhanced Opportunity
export interface Opportunity {
  molecule: string;
  rank: number;
  confidence: number;
  rationale: string;
  ftoFlag: string;
  scoreBreakdown?: ScoreBreakdown;
  competitiveAnalysis?: CompetitiveAnalysis;
  licensingAnalysis?: LicensingAnalysis;
  geoReadiness?: GeoReadiness[];
}

export interface MoleculeTrialData {
  molecule: string;
  trialCount: number;
  phases: Record<string, number>;
  sponsors: string[];
  citations: string[];
  countries: string[];
}

export interface MoleculePatentData {
  molecule: string;
  jurisdictions: string[];
  earliestExpiry: string;
  latestExpiry?: string;
  ftoFlag: string;
  citations: string[];
  yearsToExpiry?: number;
}

// Patent Cliff Data
export interface PatentCliffEntry {
  molecule: string;
  latestExpiry: string;
  jurisdictions: string[];
  yearsToExpiry: number;
}

export interface PatentCliffData {
  expiring1Year: PatentCliffEntry[];
  expiring3Years: PatentCliffEntry[];
  expiring5Years: PatentCliffEntry[];
  alreadyExpired: PatentCliffEntry[];
}

// Confidence Decomposition
export interface ConfidenceDecomposition {
  overall: number;
  dataConfidence: number;
  aiConfidence: number;
  breakdown: {
    trialDataScore: number;
    patentDataScore: number;
    aiAnalysisScore: number;
  };
}

// Market Insights
export interface MarketInsights {
  totalMoleculesAnalyzed: number;
  lowFtoCount: number;
  mediumFtoCount: number;
  highFtoCount: number;
  avgCompetitionIndex: number;
  strongLicensingCandidates: number;
}

export interface JobStatus {
  id: string;
  status: string;
  queryText: string;
  resultId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportResponse {
  reportId: string;
  queryText: string;
  summary: string;
  confidence: number;
  opportunities: Opportunity[];
  trialsSummary: { byMolecule: MoleculeTrialData[] };
  patentSummary: { byMolecule: MoleculePatentData[] };
  recommendations: string[];
  pdfUrl: string;
  createdAt: string;
  // Enhanced fields
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}

// Query Templates
export const QUERY_TEMPLATES = [
  {
    label: '🇮🇳 India Generic Entry Scan',
    query: 'Find respiratory molecules with LOW patent risk suitable for generic entry in India',
  },
  {
    label: '📋 Licensing-Ready Phase II Assets',
    query: 'Show Phase II molecules with strong licensing signals and low competition',
  },
  {
    label: '📅 Patent Cliff Next 3 Years',
    query: 'Find molecules with patents expiring in the next 3 years for generic development',
  },
  {
    label: '🧬 Oncology Opportunities',
    query: 'Analyze oncology molecules with favorable FTO and active clinical trials',
  },
  {
    label: '💊 Diabetes Market Analysis',
    query: 'Find diabetes molecules in Phase II/III with licensing potential',
  },
];

export const api = {
  createQuery: async (queryText: string) => {
    const response = await apiClient.post('/query', { queryText });
    return response.data;
  },

  getJobStatus: async (jobId: string): Promise<JobStatus> => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  getTrace: async (jobId: string): Promise<AgentTraceEvent[]> => {
    const response = await apiClient.get(`/jobs/${jobId}/trace`);
    return response.data;
  },

  getReport: async (jobId: string): Promise<ReportResponse> => {
    const response = await apiClient.get(`/jobs/${jobId}/report`);
    return response.data;
  },

  getPdfUrl: (reportId: string) => {
    return `${API_BASE_URL}/reports/${reportId}/pdf`;
  },
};
