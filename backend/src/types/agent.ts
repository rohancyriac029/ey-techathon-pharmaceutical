export type AgentStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentTraceEvent {
  agent: string;
  status: AgentStatus;
  timestamp: string;
  detail?: string;
}

export interface MoleculeTrialData {
  molecule: string;
  trialCount: number;
  phases: Record<string, number>;
  sponsors: string[];
  citations: string[];
  countries: string[];
}

export interface ClinicalAgentResult {
  byMolecule: MoleculeTrialData[];
}

export interface MoleculePatentData {
  molecule: string;
  jurisdictions: string[];
  earliestExpiry: string;
  latestExpiry: string;
  ftoFlag: 'LOW' | 'MEDIUM' | 'HIGH';
  citations: string[];
  yearsToExpiry: number;
}

export interface PatentAgentResult {
  byMolecule: MoleculePatentData[];
  patentCliff: PatentCliffData;
}

// ============================================
// Patent Cliff Radar Data
// ============================================
export interface PatentCliffData {
  expiring1Year: PatentCliffEntry[];
  expiring3Years: PatentCliffEntry[];
  expiring5Years: PatentCliffEntry[];
  alreadyExpired: PatentCliffEntry[];
}

export interface PatentCliffEntry {
  molecule: string;
  latestExpiry: string;
  jurisdictions: string[];
  yearsToExpiry: number;
}

// ============================================
// Score Breakdown for Explainability
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

// ============================================
// Competitive Intensity
// ============================================
export type CompetitiveIntensity = 'UNDERCROWDED' | 'COMPETITIVE' | 'SATURATED';

export interface CompetitiveAnalysis {
  intensity: CompetitiveIntensity;
  sponsorCount: number;
  trialCount: number;
  jurisdictionCount: number;
  indexScore: number; // 0-100
}

// ============================================
// Licensing Signal
// ============================================
export type LicensingSignal = 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';

export interface LicensingAnalysis {
  signal: LicensingSignal;
  reasons: string[];
  phase2Trials: number;
  phase3Trials: number;
  sponsorDiversity: number;
}

// ============================================
// Geographic Readiness
// ============================================
export interface GeoReadiness {
  country: string;
  readinessScore: number; // 0-1
  hasTrials: boolean;
  hasFavorablePatent: boolean;
  sponsorPresence: boolean;
}

// ============================================
// Enhanced Opportunity with Explainability
// ============================================
export interface Opportunity {
  molecule: string;
  rank: number;
  confidence: number;
  rationale: string;
  ftoFlag: string;
  // Explainability fields
  scoreBreakdown?: ScoreBreakdown;
  competitiveAnalysis?: CompetitiveAnalysis;
  licensingAnalysis?: LicensingAnalysis;
  geoReadiness?: GeoReadiness[];
}

// ============================================
// Confidence Decomposition
// ============================================
export interface ConfidenceDecomposition {
  overall: number;
  dataConfidence: number;    // Based on trial + patent data
  aiConfidence: number;      // Based on AI inference
  breakdown: {
    trialDataScore: number;
    patentDataScore: number;
    aiAnalysisScore: number;
  };
}

// ============================================
// Enhanced Synthesis Result
// ============================================
export interface SynthesisResult {
  opportunities: Opportunity[];
  overallConfidence: number;
  // Enhanced analytics
  confidenceDecomposition: ConfidenceDecomposition;
  marketInsights: MarketInsights;
}

export interface MarketInsights {
  totalMoleculesAnalyzed: number;
  lowFtoCount: number;
  mediumFtoCount: number;
  highFtoCount: number;
  avgCompetitionIndex: number;
  strongLicensingCandidates: number;
}
