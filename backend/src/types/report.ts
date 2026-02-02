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
    country: 'IN' | 'US';
    expiryDate: string;
    yearsToExpiry: number;
  }>;
  
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
