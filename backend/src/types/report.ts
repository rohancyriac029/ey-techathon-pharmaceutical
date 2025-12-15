import { 
  ClinicalAgentResult, 
  PatentAgentResult, 
  Opportunity, 
  ConfidenceDecomposition, 
  MarketInsights,
  PatentCliffData
} from './agent';

export interface ReportPayload {
  queryText: string;
  summary: string;
  opportunities: Opportunity[];
  trialsSummary: ClinicalAgentResult;
  patentSummary: PatentAgentResult;
  confidence: number;
  recommendations: string[];
  // Enhanced fields
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}

export interface ReportResponse {
  reportId: string;
  queryText: string;
  summary: string;
  confidence: number;
  opportunities: Opportunity[];
  trialsSummary: ClinicalAgentResult;
  patentSummary: PatentAgentResult;
  recommendations: string[];
  pdfUrl: string;
  // Enhanced fields
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
  suggestedQueries?: string[];
}
