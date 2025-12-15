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

export interface Opportunity {
  molecule: string;
  rank: number;
  confidence: number;
  rationale: string;
  ftoFlag: string;
}

export interface MoleculeTrialData {
  molecule: string;
  trialCount: number;
  phases: Record<string, number>;
  sponsors: string[];
  citations: string[];
}

export interface MoleculePatentData {
  molecule: string;
  jurisdictions: string[];
  earliestExpiry: string;
  latestExpiry?: string;
  ftoFlag: string;
  citations: string[];
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
}

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
