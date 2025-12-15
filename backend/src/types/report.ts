import { ClinicalAgentResult, PatentAgentResult, Opportunity } from './agent';

export interface ReportPayload {
  queryText: string;
  summary: string;
  opportunities: Opportunity[];
  trialsSummary: ClinicalAgentResult;
  patentSummary: PatentAgentResult;
  confidence: number;
  recommendations: string[];
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
}
