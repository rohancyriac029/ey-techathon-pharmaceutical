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
}

export interface PatentAgentResult {
  byMolecule: MoleculePatentData[];
}

export interface Opportunity {
  molecule: string;
  rank: number;
  confidence: number;
  rationale: string;
  ftoFlag: string;
}

export interface SynthesisResult {
  opportunities: Opportunity[];
  overallConfidence: number;
}
