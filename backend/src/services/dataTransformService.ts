/**
 * Data Transformation Utilities
 * 
 * Transforms raw API data from ClinicalTrials.gov and OpenFDA
 * into formats compatible with our Prisma schema.
 */

import { ClinicalTrialRaw, FDADrugRaw, MoleculeData, getOriginalApprovalDate } from './externalDataService';

// ============================================
// PRISMA-COMPATIBLE TYPES
// ============================================

export interface MoleculeCreate {
  name: string;
  genericName: string;
  brandName: string;
  indication: string;
  modality: string;
  innovatorCompany: string;
  launchYear?: number;
}

export interface ClinicalTrialCreate {
  molecule: string;
  indication: string;
  phase: string;
  status: string;
  country: string;
  sponsor: string;
  trialId?: string;
  startDate?: Date;
  completionDate?: Date;
  primaryEndpoint?: string;
  outcome?: string;
  citations: string;
}

export interface PatentCreate {
  molecule: string;
  country: string;
  patentNumber: string;
  patentType: string;
  isPrimary: boolean;
  status: string;
  filingDate?: Date;
  expiryDate: Date;
  title?: string;
  assignee?: string;
}

export interface RegulatoryStatusCreate {
  molecule: string;
  country: string;
  status: string;
  approvalDate?: Date;
  approvalType?: string;
  referenceProduct?: string;
}

export interface DiseaseMarketCreate {
  disease: string;
  country: string;
  year: number;
  prevalenceMillions: number;
  incidenceMillions: number;
  treatedRatePercent: number;
  avgAnnualTherapyCostUSD: number;
  marketSizeUSD?: number;
  dataSource?: string;
}

// ============================================
// TRANSFORMATION FUNCTIONS
// ============================================

/**
 * Map ClinicalTrials.gov phase to our schema format
 */
function mapPhase(phases: string[]): string {
  if (!phases || phases.length === 0) return 'Phase I';
  
  const phase = phases[0].toUpperCase();
  if (phase.includes('PHASE4') || phase.includes('PHASE 4')) return 'Phase IV';
  if (phase.includes('PHASE3') || phase.includes('PHASE 3')) return 'Phase III';
  if (phase.includes('PHASE2') || phase.includes('PHASE 2')) return 'Phase II';
  if (phase.includes('PHASE1') || phase.includes('PHASE 1')) return 'Phase I';
  if (phase.includes('NA') || phase.includes('N/A')) return 'Phase IV'; // Often post-marketing
  return 'Phase II'; // Default
}

/**
 * Map ClinicalTrials.gov status to our schema format
 */
function mapStatus(status: string): string {
  const s = status.toUpperCase();
  if (s.includes('COMPLETED')) return 'Completed';
  if (s.includes('RECRUITING') || s.includes('ENROLLING')) return 'Recruiting';
  if (s.includes('TERMINATED') || s.includes('SUSPENDED') || s.includes('WITHDRAWN')) return 'Terminated';
  if (s.includes('ACTIVE')) return 'Recruiting';
  return 'Completed';
}

/**
 * Map country name to country code
 */
function mapCountryToCode(country: string): 'US' | 'IN' {
  const c = country.toLowerCase();
  if (c.includes('united states') || c.includes('usa') || c === 'us') return 'US';
  if (c.includes('india') || c === 'in') return 'IN';
  return 'US'; // Default to US
}

/**
 * Parse date string (handles multiple formats)
 */
function parseDate(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  
  try {
    // Handle YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    // Handle YYYYMMDD format (FDA)
    if (dateStr.match(/^\d{8}$/)) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      return new Date(year, month, day);
    }
    // Handle YYYY-MM format
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
      return new Date(dateStr + '-01');
    }
    // Try generic parse
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return undefined;
}

/**
 * Determine outcome from trial status and results
 */
function determineOutcome(trial: ClinicalTrialRaw): string {
  const status = trial.overallStatus.toUpperCase();
  if (status.includes('COMPLETED')) return 'Positive'; // Assume positive if completed
  if (status.includes('TERMINATED') || status.includes('WITHDRAWN')) return 'Negative';
  if (status.includes('RECRUITING') || status.includes('ACTIVE')) return 'Ongoing';
  return 'Positive';
}

// ============================================
// MAIN TRANSFORMATION FUNCTIONS
// ============================================

/**
 * Transform molecule data from API response
 */
export function transformMolecule(data: MoleculeData): MoleculeCreate {
  return {
    name: data.molecule.name,
    genericName: data.molecule.genericName,
    brandName: data.molecule.brandName,
    indication: data.molecule.indication,
    modality: data.molecule.modality,
    innovatorCompany: data.molecule.innovator,
    launchYear: data.molecule.launchYear,
  };
}

/**
 * Transform clinical trials from API response
 */
export function transformClinicalTrials(
  data: MoleculeData,
  countryType: 'US' | 'IN'
): ClinicalTrialCreate[] {
  const trials = countryType === 'US' ? data.trialsUS : data.trialsIndia;
  
  return trials.map(trial => ({
    molecule: data.molecule.name,
    indication: trial.conditions[0] || data.molecule.indication,
    phase: mapPhase(trial.phases),
    status: mapStatus(trial.overallStatus),
    country: countryType,
    sponsor: trial.leadSponsor.name,
    trialId: trial.nctId,
    startDate: parseDate(trial.startDate),
    completionDate: parseDate(trial.completionDate),
    primaryEndpoint: trial.primaryOutcomes?.[0]?.measure || 'Efficacy endpoint',
    outcome: determineOutcome(trial),
    citations: `ClinicalTrials.gov: ${trial.nctId}`,
  }));
}

/**
 * Transform FDA data to regulatory status
 */
export function transformRegulatoryStatus(data: MoleculeData): RegulatoryStatusCreate[] {
  const results: RegulatoryStatusCreate[] = [];
  
  // US regulatory status from FDA data
  if (data.fdaData) {
    const approvalDate = getOriginalApprovalDate(data.fdaData);
    const origSubmission = data.fdaData.submissions.find(s => s.submission_type === 'ORIG');
    
    results.push({
      molecule: data.molecule.name,
      country: 'US',
      status: 'Approved',
      approvalDate: approvalDate || undefined,
      approvalType: data.fdaData.application_number.startsWith('BLA') ? 'BLA' : 'NDA',
      referenceProduct: undefined,
    });
  }
  
  // India regulatory status (inferred from trial data)
  if (data.trialsIndia.length > 0) {
    // If there are trials in India, assume some regulatory engagement
    const hasCompletedTrials = data.trialsIndia.some(t => 
      t.overallStatus.toUpperCase().includes('COMPLETED')
    );
    
    results.push({
      molecule: data.molecule.name,
      country: 'IN',
      status: hasCompletedTrials ? 'Approved' : 'Under Review',
      approvalDate: undefined,
      approvalType: undefined,
      referenceProduct: data.molecule.brandName,
    });
  } else {
    // No trials in India, mark as not filed
    results.push({
      molecule: data.molecule.name,
      country: 'IN',
      status: 'Not Filed',
      approvalDate: undefined,
      approvalType: undefined,
      referenceProduct: data.molecule.brandName,
    });
  }
  
  return results;
}

/**
 * Generate estimated patent data based on FDA approval
 * Note: Real patent data would require Orange Book or USPTO API
 */
export function generateEstimatedPatents(data: MoleculeData): PatentCreate[] {
  const results: PatentCreate[] = [];
  
  if (!data.fdaData) return results;
  
  const approvalDate = getOriginalApprovalDate(data.fdaData);
  const baseYear = approvalDate ? approvalDate.getFullYear() : 2015;
  
  // Compound patent (typically 20 years from filing, filed ~5 years before approval)
  const compoundFilingYear = baseYear - 5;
  const compoundExpiryYear = compoundFilingYear + 20;
  
  // Generate US patents
  results.push({
    molecule: data.molecule.name,
    country: 'US',
    patentNumber: `US${7000000 + Math.floor(Math.random() * 3000000)}`,
    patentType: 'COMPOUND',
    isPrimary: true,
    status: compoundExpiryYear > 2026 ? 'Active' : 'Expired',
    filingDate: new Date(compoundFilingYear, 0, 1),
    expiryDate: new Date(compoundExpiryYear, 11, 31),
    title: `${data.molecule.genericName} compound and uses thereof`,
    assignee: data.molecule.innovator,
  });
  
  // Formulation patent (typically filed closer to approval)
  const formulationFilingYear = baseYear - 2;
  const formulationExpiryYear = formulationFilingYear + 20;
  
  results.push({
    molecule: data.molecule.name,
    country: 'US',
    patentNumber: `US${8000000 + Math.floor(Math.random() * 3000000)}`,
    patentType: 'FORMULATION',
    isPrimary: false,
    status: formulationExpiryYear > 2026 ? 'Active' : 'Expired',
    filingDate: new Date(formulationFilingYear, 5, 1),
    expiryDate: new Date(formulationExpiryYear, 5, 30),
    title: `Pharmaceutical formulations of ${data.molecule.genericName}`,
    assignee: data.molecule.innovator,
  });
  
  // Generate India patents (typically similar timing)
  results.push({
    molecule: data.molecule.name,
    country: 'IN',
    patentNumber: `IN${200000 + Math.floor(Math.random() * 100000)}`,
    patentType: 'COMPOUND',
    isPrimary: true,
    status: compoundExpiryYear > 2026 ? 'Active' : 'Expired',
    filingDate: new Date(compoundFilingYear, 0, 1),
    expiryDate: new Date(compoundExpiryYear, 11, 31),
    title: `${data.molecule.genericName} compound`,
    assignee: data.molecule.innovator,
  });
  
  return results;
}

/**
 * Generate disease market data
 * Note: This uses estimated epidemiology data
 * IMPORTANT: marketSizeUSD is stored in actual dollars (not billions)
 */
export function generateDiseaseMarketData(): DiseaseMarketCreate[] {
  const currentYear = 2025;
  const BILLION = 1_000_000_000;
  
  return [
    // Type 2 Diabetes
    {
      disease: 'Type 2 Diabetes',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 37.3,
      incidenceMillions: 1.5,
      treatedRatePercent: 75,
      avgAnnualTherapyCostUSD: 9600,
      marketSizeUSD: 268.56 * BILLION, // $268.56B
      dataSource: 'CDC National Diabetes Statistics Report 2024',
    },
    {
      disease: 'Type 2 Diabetes',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 101.0,
      incidenceMillions: 12.5,
      treatedRatePercent: 35,
      avgAnnualTherapyCostUSD: 450,
      marketSizeUSD: 15.9 * BILLION, // $15.9B
      dataSource: 'IDF Diabetes Atlas 2024',
    },
    // COPD
    {
      disease: 'COPD',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 16.4,
      incidenceMillions: 0.8,
      treatedRatePercent: 65,
      avgAnnualTherapyCostUSD: 4500,
      marketSizeUSD: 47.97 * BILLION, // $47.97B
      dataSource: 'American Lung Association 2024',
    },
    {
      disease: 'COPD',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 55.0,
      incidenceMillions: 4.0,
      treatedRatePercent: 25,
      avgAnnualTherapyCostUSD: 200,
      marketSizeUSD: 2.75 * BILLION, // $2.75B
      dataSource: 'WHO Global Health Observatory 2024',
    },
    // NSCLC
    {
      disease: 'NSCLC',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 0.54,
      incidenceMillions: 0.2,
      treatedRatePercent: 85,
      avgAnnualTherapyCostUSD: 150000,
      marketSizeUSD: 68.85 * BILLION, // $68.85B
      dataSource: 'American Cancer Society 2024',
    },
    {
      disease: 'NSCLC',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 0.8,
      incidenceMillions: 0.35,
      treatedRatePercent: 40,
      avgAnnualTherapyCostUSD: 25000,
      marketSizeUSD: 8.0 * BILLION, // $8.0B
      dataSource: 'ICMR Cancer Registry 2024',
    },
    // Rheumatoid Arthritis
    {
      disease: 'Rheumatoid Arthritis',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 1.5,
      incidenceMillions: 0.05,
      treatedRatePercent: 70,
      avgAnnualTherapyCostUSD: 36000,
      marketSizeUSD: 37.8 * BILLION, // $37.8B
      dataSource: 'Arthritis Foundation 2024',
    },
    {
      disease: 'Rheumatoid Arthritis',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 9.0,
      incidenceMillions: 0.3,
      treatedRatePercent: 20,
      avgAnnualTherapyCostUSD: 2000,
      marketSizeUSD: 3.6 * BILLION, // $3.6B
      dataSource: 'Indian Rheumatology Association 2024',
    },
    // Cardiovascular Disease
    {
      disease: 'Cardiovascular',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 28.0,
      incidenceMillions: 1.8,
      treatedRatePercent: 80,
      avgAnnualTherapyCostUSD: 2400,
      marketSizeUSD: 53.76 * BILLION, // $53.76B
      dataSource: 'AHA Heart Disease Statistics 2024',
    },
    {
      disease: 'Cardiovascular',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 80.0,
      incidenceMillions: 8.0,
      treatedRatePercent: 30,
      avgAnnualTherapyCostUSD: 300,
      marketSizeUSD: 7.2 * BILLION, // $7.2B
      dataSource: 'WHO CVD Statistics 2024',
    },
    // Hypertension
    {
      disease: 'Hypertension',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 119.9,
      incidenceMillions: 4.5,
      treatedRatePercent: 60,
      avgAnnualTherapyCostUSD: 1200,
      marketSizeUSD: 86.33 * BILLION, // $86.33B
      dataSource: 'CDC Hypertension Statistics 2024',
    },
    {
      disease: 'Hypertension',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 220.0,
      incidenceMillions: 15.0,
      treatedRatePercent: 25,
      avgAnnualTherapyCostUSD: 150,
      marketSizeUSD: 8.25 * BILLION, // $8.25B
      dataSource: 'Indian Council of Medical Research 2024',
    },
  ];
}

export default {
  transformMolecule,
  transformClinicalTrials,
  transformRegulatoryStatus,
  generateEstimatedPatents,
  generateDiseaseMarketData,
};
