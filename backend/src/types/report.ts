import { 
  ClinicalAgentResult, 
  PatentAgentResult, 
  Opportunity, 
  ConfidenceDecomposition, 
  MarketInsights,
  PatentCliffData,
  MoleculeDecision,
  CommercialStrategy,
  CommercialRisk
} from './agent';

// ============================================
// BOARD-READY REPORT PAYLOAD (NEW)
// This is what executives need to see
// ============================================

export interface ReportPayload {
  queryText: string;
  summary: string;
  
  // PRIMARY OUTPUT: Commercial decisions
  decisions: MoleculeDecision[];
  
  // Market overview
  marketOverview: {
    totalAddressableMarketUSD: number;
    byIndication: Array<{
      indication: string;
      marketSizeIN: number;
      marketSizeUS: number;
    }>;
    filteredIndication?: string; // The therapeutic area that was filtered for in the query
  };
  
  // Strategy summary
  strategySummary: {
    license: string[];      // Molecule names
    generic: string[];
    wait: string[];
    drop: string[];
  };
  
  // Recommendations (board-ready language)
  recommendations: string[];
  
  // Key dates
  upcomingPatentExpiries: Array<{
    molecule: string;
    country: 'IN' | 'US';
    expiryDate: string;
    yearsToExpiry: number;
  }>;
  
  // NEW: Patient-level epidemiology data
  epidemiologyOverview?: EpidemiologyOverview;
  
  // PDF path
  pdfPath?: string;
  
  // Legacy fields (for backward compatibility)
  confidence?: number;
  opportunities?: Opportunity[];
  trialsSummary?: ClinicalAgentResult;
  patentSummary?: PatentAgentResult;
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}

// ============================================
// NEW: Epidemiology Data Types
// ============================================

export interface DiseaseEpidemiologyData {
  disease: string;
  country: 'US' | 'IN' | 'GLOBAL';
  year: number;
  prevalenceTotal: number;
  incidenceAnnual: number;
  mortalityAnnual: number;
  prevalenceRate: number;
  incidenceRate: number;
  mortalityRate: number;
  diagnosedPercent: number;
  treatedPercent: number;
  controlledPercent?: number;
  malePercent?: number;
  femalePercent?: number;
  avgAgeAtDiagnosis?: number;
  age65PlusPercent?: number;
  prevalenceChangeYoY?: number;
  incidenceChangeYoY?: number;
  mortalityChangeYoY?: number;
  dataSource: string;
  sourceUrl?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DrugUtilizationData {
  molecule: string;
  country: 'US' | 'IN';
  year: number;
  totalPatientsOnDrug: number;
  newPatientsAnnual?: number;
  discontinuationRate?: number;
  totalPrescriptions: number;
  prescriptionsPerPatient?: number;
  patientCountChangeYoY?: number;
  marketSharePercent?: number;
  dataSource: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface HistoricalTrendData {
  disease: string;
  country: string;
  metric: string;
  years: number[];
  values: number[];
  dataSource: string;
}

export interface EpidemiologyOverview {
  diseases: DiseaseEpidemiologyData[];
  drugUtilization: DrugUtilizationData[];
  trends: HistoricalTrendData[];
}

export interface ReportResponse {
  reportId: string;
  queryText: string;
  summary: string;
  
  // PRIMARY OUTPUT
  decisions: MoleculeDecision[];
  
  // Market overview
  marketOverview: {
    totalAddressableMarketUSD: number;
    byIndication: Array<{
      indication: string;
      marketSizeIN: number;
      marketSizeUS: number;
    }>;
    filteredIndication?: string; // The therapeutic area that was filtered for in the query
  };
  
  // Strategy breakdown
  strategySummary: {
    license: string[];
    generic: string[];
    wait: string[];
    drop: string[];
  };
  
  recommendations: string[];
  
  upcomingPatentExpiries: Array<{
    molecule: string;
  upcomingPatentExpiries: Array<{
    molecule: string;
    country: 'IN' | 'US';
    expiryDate: string;
    yearsToExpiry: number;
  }>;
  
  // NEW: Patient-level epidemiology data
  epidemiologyOverview?: EpidemiologyOverview;
  
  pdfUrl: string;
  createdAt: string;
  
  // Legacy fields
  confidence?: number;
  opportunities?: Opportunity[];
  trialsSummary?: ClinicalAgentResult;
  patentSummary?: PatentAgentResult;
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}
