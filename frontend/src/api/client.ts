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

// ============================================
// NEW: Commercial Decision Types
// ============================================

export type CommercialStrategy = 'LICENSE' | 'GENERIC' | 'WAIT' | 'DROP';
export type CommercialRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type GoNoGo = 'GO' | 'NO-GO' | 'CONDITIONAL';

export interface CountryRecommendation {
  country: 'IN' | 'US';
  strategy: CommercialStrategy;
  timeToMarketYears: number;
  estimatedRevenueUSD: number;
  commercialRisk: CommercialRisk;
  rationale: string;
  goNoGo: GoNoGo;
  conditions?: string[];
}

export interface MoleculeDecision {
  molecule: string;
  brandName?: string;
  indication: string;
  innovator: string;
  modality: string;
  recommendations: CountryRecommendation[];
  overallStrategy: CommercialStrategy;
  overallRisk: CommercialRisk;
  priorityRank: number;
  ftoSummary: string;
  clinicalSummary: string;
  marketSummary: string;
  earliestEntryIN?: string;
  earliestEntryUS?: string;
}

export interface MarketOverview {
  totalAddressableMarketUSD: number;
  byIndication: Array<{
    indication: string;
    marketSizeIN: number;
    marketSizeUS: number;
  }>;
  filteredIndication?: string; // The therapeutic area that was filtered for in the query
}

export interface StrategySummary {
  license: string[];
  generic: string[];
  wait: string[];
  drop: string[];
}

export interface PatentExpiry {
  molecule: string;
  country: 'IN' | 'US';
  expiryDate: string;
  yearsToExpiry: number;
}

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

export interface ScoreBreakdown {
  baseScore: number;
  trialScore: number;
  ftoAdjustment: number;
  phaseBonus: number;
  competitionPenalty: number;
  licensingBonus: number;
  total: number;
}

export type CompetitiveIntensity = 'UNDERCROWDED' | 'COMPETITIVE' | 'SATURATED';

export interface CompetitiveAnalysis {
  intensity: CompetitiveIntensity;
  sponsorCount: number;
  trialCount: number;
  jurisdictionCount: number;
  indexScore: number;
}

export type LicensingSignal = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

export interface LicensingAnalysis {
  signal: LicensingSignal;
  reasons: string[];
  phase2Trials: number;
  phase3Trials: number;
  sponsorDiversity: number;
}

export interface GeoReadiness {
  country: string;
  readinessScore: number;
  hasTrials: boolean;
  hasFavorablePatent: boolean;
  sponsorPresence: boolean;
}

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

export interface MarketInsights {
  totalMoleculesAnalyzed: number;
  lowFtoCount?: number;
  mediumFtoCount?: number;
  highFtoCount?: number;
  avgCompetitionIndex?: number;
  strongLicensingCandidates?: number;
}

export interface JobStatus {
  id: string;
  status: string;
  queryText: string;
  resultId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// NEW: Decision-Driven Report Response
// ============================================

export interface ReportResponse {
  reportId: string;
  queryText: string;
  summary: string;
  
  // PRIMARY OUTPUT: Commercial Decisions
  decisions: MoleculeDecision[];
  marketOverview: MarketOverview;
  strategySummary: StrategySummary;
  upcomingPatentExpiries: PatentExpiry[];
  
  recommendations: string[];
  pdfUrl: string;
  createdAt: string;
  
  // Legacy fields (optional)
  confidence?: number;
  opportunities?: Opportunity[];
  trialsSummary?: { byMolecule: MoleculeTrialData[] };
  patentSummary?: { byMolecule: MoleculePatentData[] };
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}

// ============================================
// Updated Query Templates for Decision Platform
// ============================================

export const QUERY_TEMPLATES = [
  {
    label: '🇮🇳 India Generic Entry Scan',
    query: 'Find molecules with expired patents in India suitable for immediate generic entry',
  },
  {
    label: '💰 High-Value Licensing Opportunities',
    query: 'Show diabetes molecules with licensing potential and large market size in US',
  },
  {
    label: '📅 Patent Cliff 2026-2028',
    query: 'Find COPD molecules with patents expiring in the next 2-4 years for generic planning',
  },
  {
    label: '🇺🇸 US Market Opportunities',
    query: 'Analyze molecules approved in US with favorable FTO status',
  },
  {
    label: '📊 Full Portfolio Scan',
    query: 'Analyze all molecules across COPD, diabetes, and oncology for India and US markets',
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
