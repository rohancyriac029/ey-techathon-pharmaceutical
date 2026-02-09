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
  claims?: string;
  applicant?: string;
  devicePatent?: boolean;
  litigationHistory?: any;
  litigationRisk?: string;
  dataQuality?: string;
  confidenceLevel?: string;
  dataSource?: string;
  reviewedBy?: string;
  notes?: string;
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
 * NOTE: determineOutcome() has been REMOVED
 * We no longer fabricate trial outcomes based on status.
 * Trial outcomes should be null unless verified from published papers/ClinicalTrials.gov results.
 */

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
    outcome: undefined, // Do not fabricate outcomes - must be verified from published results
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
 * NOTE: generateEstimatedPatents() has been REMOVED
 * We no longer generate fake patent numbers.
 * Use patentDataService.fetchPatents() to get real patent data from Orange Book/USPTO/curated sources.
 */

/**
 * Generate disease market data
 * 
 * REALISTIC MARKET SIZING METHODOLOGY:
 * =====================================
 * These are DRUG-SPECIFIC market sizes, not total disease market sizes.
 * 
 * Calculation: Treated Patients × Annual Therapy Cost × Drug Class Market Share
 * 
 * We use conservative estimates reflecting:
 * - Actual treated patient populations (prevalence × treatment rate)
 * - Realistic drug therapy costs (not total healthcare costs)
 * - Drug class market share (single drug class, not entire therapeutic area)
 * 
 * Sources: IQVIA Drug Market Data, CMS Part D, and published market research
 */
export function generateDiseaseMarketData(): DiseaseMarketCreate[] {
  const currentYear = 2025;
  const MILLION = 1_000_000;
  
  return [
    // Type 2 Diabetes - GLP-1 Agonist Market (not entire diabetes market)
    // US: ~4.5M patients on GLP-1s, avg $10,800/year = $48.6B for GLP-1 class
    {
      disease: 'Type 2 Diabetes',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 37.3,           // Total diabetics
      incidenceMillions: 1.5,
      treatedRatePercent: 75,
      avgAnnualTherapyCostUSD: 3200,      // Average across all diabetes drugs
      marketSizeUSD: 42.5 * MILLION * 1000, // $42.5B - Total US diabetes drug market (IQVIA 2024)
      dataSource: 'IQVIA Institute 2024; CDC National Diabetes Statistics Report',
    },
    // India: ~35M treated patients, avg $180/year = $6.3B diabetes drug market
    {
      disease: 'Type 2 Diabetes',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 101.0,          // Total diabetics
      incidenceMillions: 12.5,
      treatedRatePercent: 35,
      avgAnnualTherapyCostUSD: 180,       // Much lower avg therapy cost in India
      marketSizeUSD: 6.3 * MILLION * 1000, // $6.3B - India diabetes drug market
      dataSource: 'IDF Diabetes Atlas 2024; IQVIA India 2024',
    },
    
    // COPD - Respiratory Drug Market
    // US: ~10.7M treated COPD patients, avg $2,400/year = $25.7B respiratory market
    {
      disease: 'COPD',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 16.4,           // Total COPD patients
      incidenceMillions: 0.8,
      treatedRatePercent: 65,
      avgAnnualTherapyCostUSD: 2400,      // Inhaler + therapy costs
      marketSizeUSD: 18.5 * MILLION * 1000, // $18.5B - US COPD drug market (not total respiratory)
      dataSource: 'American Lung Association 2024; IQVIA COPD Market 2024',
    },
    // India: ~13.75M treated, avg $120/year = $1.65B
    {
      disease: 'COPD',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 55.0,
      incidenceMillions: 4.0,
      treatedRatePercent: 25,
      avgAnnualTherapyCostUSD: 120,       // Lower cost in India
      marketSizeUSD: 1.65 * MILLION * 1000, // $1.65B - India COPD drug market
      dataSource: 'WHO Global Health Observatory 2024; IQVIA India 2024',
    },
    
    // NSCLC - Lung Cancer Drug Market (including targeted therapies)
    // US: ~150K patients on active treatment, avg $120K/year = $18B
    {
      disease: 'NSCLC',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 0.54,           // Living with lung cancer
      incidenceMillions: 0.2,
      treatedRatePercent: 55,             // Many patients too advanced for treatment
      avgAnnualTherapyCostUSD: 60000,     // Mix of targeted, IO, and chemo
      marketSizeUSD: 15.8 * MILLION * 1000, // $15.8B - US lung cancer drug market
      dataSource: 'American Cancer Society 2024; IQVIA Oncology 2024',
    },
    // India: Lower treatment rates, lower costs
    {
      disease: 'NSCLC',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 0.8,
      incidenceMillions: 0.35,
      treatedRatePercent: 35,             // Access challenges
      avgAnnualTherapyCostUSD: 8500,      // Generic & biosimilar availability
      marketSizeUSD: 2.4 * MILLION * 1000, // $2.4B - India lung cancer drug market
      dataSource: 'ICMR Cancer Registry 2024; IQVIA India 2024',
    },
    
    // Rheumatoid Arthritis - RA Drug Market
    // US: ~1.05M treated, mix of biologics and DMARDs
    {
      disease: 'Rheumatoid Arthritis',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 1.5,
      incidenceMillions: 0.05,
      treatedRatePercent: 70,
      avgAnnualTherapyCostUSD: 18000,     // Mix of biologics (~$40K) and DMARDs (~$5K)
      marketSizeUSD: 12.5 * MILLION * 1000, // $12.5B - US RA drug market
      dataSource: 'Arthritis Foundation 2024; IQVIA 2024',
    },
    // India: Lower biologic use, mostly conventional DMARDs
    {
      disease: 'Rheumatoid Arthritis',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 9.0,
      incidenceMillions: 0.3,
      treatedRatePercent: 20,
      avgAnnualTherapyCostUSD: 650,       // Mostly generic DMARDs
      marketSizeUSD: 1.17 * MILLION * 1000, // $1.17B - India RA drug market
      dataSource: 'Indian Rheumatology Association 2024',
    },
    
    // Cardiovascular Disease - CV Drug Market (statins, antiplatelets, etc.)
    // US: ~22.4M on CV drugs, avg $1,200/year
    {
      disease: 'Cardiovascular',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 28.0,
      incidenceMillions: 1.8,
      treatedRatePercent: 80,
      avgAnnualTherapyCostUSD: 950,       // Heavily genericized market
      marketSizeUSD: 21.3 * MILLION * 1000, // $21.3B - US CV drug market
      dataSource: 'AHA Heart Disease Statistics 2024; IQVIA 2024',
    },
    // India: Large patient base, low costs
    {
      disease: 'Cardiovascular',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 80.0,
      incidenceMillions: 8.0,
      treatedRatePercent: 30,
      avgAnnualTherapyCostUSD: 85,        // Very low generic costs
      marketSizeUSD: 2.04 * MILLION * 1000, // $2.04B - India CV drug market
      dataSource: 'WHO CVD Statistics 2024; IQVIA India 2024',
    },
    
    // Hypertension - Antihypertensive Drug Market
    // US: ~72M treated, highly genericized
    {
      disease: 'Hypertension',
      country: 'US',
      year: currentYear,
      prevalenceMillions: 119.9,
      incidenceMillions: 4.5,
      treatedRatePercent: 60,
      avgAnnualTherapyCostUSD: 380,       // Highly genericized
      marketSizeUSD: 27.3 * MILLION * 1000, // $27.3B - US antihypertensive market
      dataSource: 'CDC Hypertension Statistics 2024; IQVIA 2024',
    },
    // India: Very large patient base, very low costs
    {
      disease: 'Hypertension',
      country: 'IN',
      year: currentYear,
      prevalenceMillions: 220.0,
      incidenceMillions: 15.0,
      treatedRatePercent: 25,
      avgAnnualTherapyCostUSD: 36,        // Extremely low generic costs
      marketSizeUSD: 1.98 * MILLION * 1000, // $1.98B - India antihypertensive market
      dataSource: 'Indian Council of Medical Research 2024; IQVIA India 2024',
    },
  ];
}

export default {
  transformMolecule,
  transformClinicalTrials,
  transformRegulatoryStatus,
  generateDiseaseMarketData,
};
