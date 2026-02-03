export type AgentStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentTraceEvent {
  agent: string;
  status: AgentStatus;
  timestamp: string;
  detail?: string;
}

// ============================================
// COMMERCIAL DECISION TYPES (NEW)
// These drive business decisions, not just analytics
// ============================================

export type CommercialStrategy = 'LICENSE' | 'GENERIC' | 'WAIT' | 'DROP';
export type CommercialRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type FTOStatus = 'CLEAR' | 'BLOCKED' | 'EXPIRING_SOON';

// ============================================
// MOLECULE MASTER DATA
// ============================================

export interface MoleculeData {
  name: string;
  genericName?: string;
  brandName?: string;
  indication: string;
  modality: string;
  innovatorCompany: string;
  launchYear?: number;
}

// ============================================
// PATENT FTO ANALYSIS (COUNTRY-SPECIFIC)
// ============================================

export interface PatentInfo {
  patentNumber: string;
  patentType: 'COMPOUND' | 'FORMULATION' | 'PROCESS' | 'SECONDARY';
  isPrimary: boolean;
  expiryDate: string;
  status: 'Active' | 'Expired';
  title?: string;
}

export interface CountryFTOAnalysis {
  country: 'IN' | 'US';
  ftoStatus: FTOStatus;
  earliestGenericEntry: string;  // Date when generic can enter
  yearsToGenericEntry: number;
  blockingPatents: PatentInfo[];
  expiredPatents: PatentInfo[];
  riskExplanation: string;       // Plain English explanation
}

export interface MoleculeFTOResult {
  molecule: string;
  byCountry: CountryFTOAnalysis[];
  overallFTO: FTOStatus;         // Worst case across countries
  primaryPatentExpired: boolean;
  hasSecondaryBlocking: boolean;
}

export interface PatentFTOAgentResult {
  molecules: MoleculeFTOResult[];
}

// ============================================
// CLINICAL MATURITY ASSESSMENT
// ============================================

export interface ClinicalTrialInfo {
  trialId?: string;
  phase: string;
  status: string;
  country: string;
  sponsor: string;
  outcome?: string;
  completionDate?: string;
}

export interface ClinicalMaturityAssessment {
  molecule: string;
  indication: string;
  highestPhaseCompleted: string;  // "Phase III", "Phase IV", etc.
  hasPhase3Data: boolean;
  hasLocalTrialData: Record<'IN' | 'US', boolean>;
  regulatoryStatus: Record<'IN' | 'US', string>;
  clinicalRiskFlags: string[];    // e.g., ["No local Phase III", "Terminated trial"]
  maturityScore: number;          // 0-100
  trials: ClinicalTrialInfo[];
}

export interface ClinicalMaturityAgentResult {
  molecules: ClinicalMaturityAssessment[];
}

// ============================================
// EPIDEMIOLOGY / MARKET DATA
// ============================================

export interface DiseaseMarketData {
  disease: string;
  country: 'IN' | 'US';
  year: number;
  prevalenceMillions: number;
  incidenceMillions: number;
  treatedRatePercent: number;
  avgAnnualTherapyCostUSD: number;
  marketSizeUSD: number;
  dataSource?: string;
  // Enhanced fields
  cagr5YearProjected?: number;
  genericErosionRate?: number;
}

// NEW: Drug-specific pricing data
export interface DrugPricingInfo {
  country: 'IN' | 'US';
  year: number;
  totalSpendingUSD?: number;
  totalClaims?: number;
  brandPriceUSD?: number;
  genericPriceUSD?: number;
  priceErosionPct?: number;
  dataSource: string;
  dataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// NEW: Competition analysis data
export interface CompetitionInfo {
  country: 'IN' | 'US';
  genericApprovals: number;
  biosimilarApprovals: number;
  activeManufacturers: number;
  topCompetitors?: string[];
  firstGenericDate?: string;
  brandMarketSharePct?: number;
  genericPenetrationPct?: number;
  competitionIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
  dataSource: string;
}

export interface MoleculeMarketAnalysis {
  molecule: string;
  indication: string;
  marketData: DiseaseMarketData[];
  estimatedRevenueUSD: Record<'IN' | 'US', number>;  // Addressable market share
  marketAttractiveness: Record<'IN' | 'US', 'HIGH' | 'MEDIUM' | 'LOW'>;
  totalAddressableMarketUSD: number;
  // NEW: Enhanced data
  pricingData?: DrugPricingInfo[];
  competitionData?: CompetitionInfo[];
  adjustedMarketShare?: Record<'IN' | 'US', number>;  // Competition-adjusted %
  revenueExplanation?: Record<'IN' | 'US', string>;   // How revenue was calculated
}

export interface EpidemiologyMarketAgentResult {
  molecules: MoleculeMarketAnalysis[];
}

// ============================================
// COMMERCIAL DECISION OUTPUT
// This is what the BD head needs to see
// ============================================

export interface CountryRecommendation {
  country: 'IN' | 'US';
  strategy: CommercialStrategy;
  timeToMarketYears: number;
  estimatedRevenueUSD: number;
  commercialRisk: CommercialRisk;
  rationale: string;              // Plain English, board-ready
  goNoGo: 'GO' | 'NO-GO' | 'CONDITIONAL';
  conditions?: string[];          // What needs to happen for GO
}

export interface MoleculeDecision {
  molecule: string;
  brandName?: string;
  indication: string;
  innovator: string;
  modality: string;
  
  // Per-country decisions
  recommendations: CountryRecommendation[];
  
  // Overall assessment
  overallStrategy: CommercialStrategy;
  overallRisk: CommercialRisk;
  priorityRank: number;
  
  // Supporting data
  ftoSummary: string;             // "Patents expired in IN, blocking until 2028 in US"
  clinicalSummary: string;        // "Phase III completed, approved in both markets"
  marketSummary: string;          // "$8.2B market in India, 45% treated"
  
  // Key dates
  earliestEntryIN?: string;
  earliestEntryUS?: string;
}

export interface CommercialDecisionAgentResult {
  decisions: MoleculeDecision[];
  summary: {
    totalMolecules: number;
    licenseOpportunities: number;
    genericOpportunities: number;
    waitOpportunities: number;
    dropRecommendations: number;
  };
}

// ============================================
// SYNTHESIS RESULT (UPDATED)
// Supports both new decision-driven format and legacy format
// ============================================

export interface SynthesisResult {
  // New decision-driven format
  decisions?: MoleculeDecision[];
  marketInsights?: MarketInsights;
  executiveSummary?: string;
  
  // Legacy format (for backward compatibility with old synthesisEngine)
  opportunities?: Opportunity[];
  overallConfidence?: number;
  confidenceDecomposition?: ConfidenceDecomposition;
}

export interface MarketInsights {
  totalMoleculesAnalyzed: number;
  totalAddressableMarketUSD?: number;
  byIndication?: Array<{
    indication: string;
    molecules: number;
    marketSizeUSD: number;
  }>;
  topOpportunity?: {
    molecule: string;
    strategy: CommercialStrategy;
    estimatedRevenueUSD: number;
  };
  // Legacy fields for backward compatibility with old synthesisEngine
  strongLicensingCandidates?: number;
  lowFtoCount?: number;
  mediumFtoCount?: number;
  highFtoCount?: number;
  avgCompetitionIndex?: number;
}

// ============================================
// LEGACY TYPES (kept for backward compatibility)
// ============================================

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

// Legacy Opportunity type - now replaced by MoleculeDecision
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
