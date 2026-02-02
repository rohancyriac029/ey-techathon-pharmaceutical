/**
 * External Data Service
 * 
 * Fetches real pharmaceutical data from:
 * - ClinicalTrials.gov API (clinical trial data)
 * - OpenFDA Drugs@FDA API (regulatory/approval data)
 */

import axios from 'axios';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ClinicalTrialRaw {
  nctId: string;
  briefTitle: string;
  officialTitle?: string;
  overallStatus: string;
  phases: string[];
  conditions: string[];
  interventions: {
    type: string;
    name: string;
    description?: string;
  }[];
  leadSponsor: {
    name: string;
    class: string;
  };
  startDate?: string;
  completionDate?: string;
  primaryOutcomes?: {
    measure: string;
    description?: string;
    timeFrame?: string;
  }[];
  enrollmentCount?: number;
  locations?: {
    country: string;
    city?: string;
    facility?: string;
  }[];
}

export interface FDADrugRaw {
  application_number: string;
  sponsor_name: string;
  brand_name: string;
  generic_name: string;
  submissions: {
    submission_type: string;
    submission_number: string;
    submission_status: string;
    submission_status_date: string;
    submission_class_code_description?: string;
  }[];
  products: {
    product_number: string;
    brand_name: string;
    active_ingredients: {
      name: string;
      strength: string;
    }[];
    dosage_form: string;
    route: string;
    marketing_status: string;
  }[];
}

// ============================================
// API CONFIGURATION
// ============================================

const CLINICAL_TRIALS_BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';
const OPENFDA_BASE_URL = 'https://api.fda.gov/drug/drugsfda.json';

// Molecules to fetch data for - balanced across disease types with good data availability
// Target: ~4 molecules per therapeutic area = 24 total
export const TARGET_MOLECULES = [
  // ============================================
  // TYPE 2 DIABETES (4 molecules)
  // ============================================
  { name: 'Semaglutide', brandName: 'Ozempic', genericName: 'semaglutide', indication: 'Type 2 Diabetes', modality: 'peptide', innovator: 'Novo Nordisk' },
  { name: 'Sitagliptin', brandName: 'Januvia', genericName: 'sitagliptin', indication: 'Type 2 Diabetes', modality: 'small-molecule', innovator: 'Merck' },
  { name: 'Empagliflozin', brandName: 'Jardiance', genericName: 'empagliflozin', indication: 'Type 2 Diabetes', modality: 'small-molecule', innovator: 'Boehringer Ingelheim' },
  { name: 'Metformin', brandName: 'Glucophage', genericName: 'metformin', indication: 'Type 2 Diabetes', modality: 'small-molecule', innovator: 'Bristol-Myers Squibb' },
  
  // ============================================
  // COPD / RESPIRATORY (4 molecules)
  // ============================================
  { name: 'Tiotropium', brandName: 'Spiriva', genericName: 'tiotropium', indication: 'COPD', modality: 'small-molecule', innovator: 'Boehringer Ingelheim' },
  { name: 'Umeclidinium', brandName: 'Incruse Ellipta', genericName: 'umeclidinium', indication: 'COPD', modality: 'small-molecule', innovator: 'GlaxoSmithKline' },
  { name: 'Indacaterol', brandName: 'Arcapta', genericName: 'indacaterol', indication: 'COPD', modality: 'small-molecule', innovator: 'Novartis' },
  { name: 'Roflumilast', brandName: 'Daliresp', genericName: 'roflumilast', indication: 'COPD', modality: 'small-molecule', innovator: 'AstraZeneca' },
  
  // ============================================
  // NSCLC / ONCOLOGY (4 molecules)
  // ============================================
  { name: 'Osimertinib', brandName: 'Tagrisso', genericName: 'osimertinib', indication: 'NSCLC', modality: 'small-molecule', innovator: 'AstraZeneca' },
  { name: 'Pembrolizumab', brandName: 'Keytruda', genericName: 'pembrolizumab', indication: 'NSCLC', modality: 'mAb', innovator: 'Merck' },
  { name: 'Erlotinib', brandName: 'Tarceva', genericName: 'erlotinib', indication: 'NSCLC', modality: 'small-molecule', innovator: 'Roche' },
  { name: 'Gefitinib', brandName: 'Iressa', genericName: 'gefitinib', indication: 'NSCLC', modality: 'small-molecule', innovator: 'AstraZeneca' },
  
  // ============================================
  // RHEUMATOID ARTHRITIS (4 molecules)
  // ============================================
  { name: 'Adalimumab', brandName: 'Humira', genericName: 'adalimumab', indication: 'Rheumatoid Arthritis', modality: 'mAb', innovator: 'AbbVie' },
  { name: 'Etanercept', brandName: 'Enbrel', genericName: 'etanercept', indication: 'Rheumatoid Arthritis', modality: 'mAb', innovator: 'Amgen' },
  { name: 'Tofacitinib', brandName: 'Xeljanz', genericName: 'tofacitinib', indication: 'Rheumatoid Arthritis', modality: 'small-molecule', innovator: 'Pfizer' },
  { name: 'Baricitinib', brandName: 'Olumiant', genericName: 'baricitinib', indication: 'Rheumatoid Arthritis', modality: 'small-molecule', innovator: 'Eli Lilly' },
  
  // ============================================
  // CARDIOVASCULAR (4 molecules)
  // ============================================
  { name: 'Atorvastatin', brandName: 'Lipitor', genericName: 'atorvastatin', indication: 'Cardiovascular', modality: 'small-molecule', innovator: 'Pfizer' },
  { name: 'Rosuvastatin', brandName: 'Crestor', genericName: 'rosuvastatin', indication: 'Cardiovascular', modality: 'small-molecule', innovator: 'AstraZeneca' },
  { name: 'Ezetimibe', brandName: 'Zetia', genericName: 'ezetimibe', indication: 'Cardiovascular', modality: 'small-molecule', innovator: 'Merck' },
  { name: 'Clopidogrel', brandName: 'Plavix', genericName: 'clopidogrel', indication: 'Cardiovascular', modality: 'small-molecule', innovator: 'Sanofi' },
  
  // ============================================
  // HYPERTENSION (4 molecules)
  // ============================================
  { name: 'Lisinopril', brandName: 'Zestril', genericName: 'lisinopril', indication: 'Hypertension', modality: 'small-molecule', innovator: 'AstraZeneca' },
  { name: 'Amlodipine', brandName: 'Norvasc', genericName: 'amlodipine', indication: 'Hypertension', modality: 'small-molecule', innovator: 'Pfizer' },
  { name: 'Losartan', brandName: 'Cozaar', genericName: 'losartan', indication: 'Hypertension', modality: 'small-molecule', innovator: 'Merck' },
  { name: 'Valsartan', brandName: 'Diovan', genericName: 'valsartan', indication: 'Hypertension', modality: 'small-molecule', innovator: 'Novartis' },
];

// ============================================
// CLINICALTRIALS.GOV API FUNCTIONS
// ============================================

/**
 * Fetch clinical trials for a specific molecule
 */
export async function fetchClinicalTrials(
  moleculeName: string,
  options: {
    pageSize?: number;
    countryFilter?: string;
    phaseFilter?: string;
    statusFilter?: string;
  } = {}
): Promise<ClinicalTrialRaw[]> {
  const { pageSize = 20, countryFilter, statusFilter } = options;
  
  try {
    // Build query parameters
    let url = `${CLINICAL_TRIALS_BASE_URL}?query.term=${encodeURIComponent(moleculeName)}&pageSize=${pageSize}`;
    
    // Add filters
    const filters: string[] = [];
    if (countryFilter) {
      filters.push(`AREA[LocationCountry]${countryFilter}`);
    }
    if (statusFilter) {
      filters.push(`AREA[OverallStatus]${statusFilter}`);
    }
    if (filters.length > 0) {
      url += `&filter.advanced=${encodeURIComponent(filters.join(' AND '))}`;
    }

    console.log(`  Fetching trials for ${moleculeName}...`);
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      }
    });

    const studies = response.data.studies || [];
    console.log(`  Found ${studies.length} trials for ${moleculeName}`);

    return studies.map((study: any) => {
      const protocol = study.protocolSection || {};
      const identification = protocol.identificationModule || {};
      const status = protocol.statusModule || {};
      const design = protocol.designModule || {};
      const conditions = protocol.conditionsModule || {};
      const armsInterventions = protocol.armsInterventionsModule || {};
      const sponsors = protocol.sponsorCollaboratorsModule || {};
      const outcomes = protocol.outcomesModule || {};
      const contacts = protocol.contactsLocationsModule || {};

      return {
        nctId: identification.nctId || '',
        briefTitle: identification.briefTitle || '',
        officialTitle: identification.officialTitle,
        overallStatus: status.overallStatus || 'UNKNOWN',
        phases: design.phases || [],
        conditions: conditions.conditions || [],
        interventions: (armsInterventions.interventions || []).map((i: any) => ({
          type: i.type || 'DRUG',
          name: i.name || '',
          description: i.description,
        })),
        leadSponsor: {
          name: sponsors.leadSponsor?.name || 'Unknown',
          class: sponsors.leadSponsor?.class || 'OTHER',
        },
        startDate: status.startDateStruct?.date,
        completionDate: status.completionDateStruct?.date,
        primaryOutcomes: (outcomes.primaryOutcomes || []).map((o: any) => ({
          measure: o.measure || '',
          description: o.description,
          timeFrame: o.timeFrame,
        })),
        enrollmentCount: design.enrollmentInfo?.count,
        locations: (contacts.locations || []).map((loc: any) => ({
          country: loc.country || '',
          city: loc.city,
          facility: loc.facility,
        })),
      };
    });
  } catch (error: any) {
    console.error(`  Error fetching trials for ${moleculeName}:`, error.message);
    return [];
  }
}

/**
 * Fetch trials for a molecule, filtering by country
 */
export async function fetchTrialsByCountry(
  moleculeName: string,
  country: 'United States' | 'India'
): Promise<ClinicalTrialRaw[]> {
  return fetchClinicalTrials(moleculeName, {
    countryFilter: country,
    pageSize: 15,
  });
}

// ============================================
// OPENFDA API FUNCTIONS
// ============================================

/**
 * Fetch FDA drug information by brand name
 */
export async function fetchFDADrugInfo(brandName: string): Promise<FDADrugRaw | null> {
  try {
    const url = `${OPENFDA_BASE_URL}?search=products.brand_name:${encodeURIComponent(brandName)}&limit=1`;
    
    console.log(`  Fetching FDA data for ${brandName}...`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      }
    });

    const results = response.data.results || [];
    if (results.length === 0) {
      console.log(`  No FDA data found for ${brandName}`);
      return null;
    }

    const drug = results[0];
    const openfda = drug.openfda || {};

    return {
      application_number: drug.application_number || '',
      sponsor_name: drug.sponsor_name || '',
      brand_name: openfda.brand_name?.[0] || brandName,
      generic_name: openfda.generic_name?.[0] || '',
      submissions: (drug.submissions || []).map((s: any) => ({
        submission_type: s.submission_type || '',
        submission_number: s.submission_number || '',
        submission_status: s.submission_status || '',
        submission_status_date: s.submission_status_date || '',
        submission_class_code_description: s.submission_class_code_description,
      })),
      products: (drug.products || []).map((p: any) => ({
        product_number: p.product_number || '',
        brand_name: p.brand_name || '',
        active_ingredients: (p.active_ingredients || []).map((ai: any) => ({
          name: ai.name || '',
          strength: ai.strength || '',
        })),
        dosage_form: p.dosage_form || '',
        route: p.route || '',
        marketing_status: p.marketing_status || '',
      })),
    };
  } catch (error: any) {
    console.error(`  Error fetching FDA data for ${brandName}:`, error.message);
    return null;
  }
}

/**
 * Get original approval date from FDA submissions
 */
export function getOriginalApprovalDate(fdaDrug: FDADrugRaw): Date | null {
  const origSubmission = fdaDrug.submissions.find(s => s.submission_type === 'ORIG');
  if (origSubmission?.submission_status_date) {
    // Format is YYYYMMDD
    const dateStr = origSubmission.submission_status_date;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
  return null;
}

// ============================================
// COMBINED DATA FETCHING
// ============================================

export interface MoleculeData {
  molecule: {
    name: string;
    genericName: string;
    brandName: string;
    indication: string;
    innovator: string;
    modality: string;
    launchYear?: number;
  };
  fdaData: FDADrugRaw | null;
  trialsUS: ClinicalTrialRaw[];
  trialsIndia: ClinicalTrialRaw[];
}

/**
 * Fetch all data for a single molecule
 */
export async function fetchMoleculeData(
  molecule: typeof TARGET_MOLECULES[0]
): Promise<MoleculeData> {
  console.log(`\n📦 Fetching data for ${molecule.name} (${molecule.brandName})...`);
  
  // Fetch FDA data
  const fdaData = await fetchFDADrugInfo(molecule.brandName);
  
  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Fetch US trials
  const trialsUS = await fetchClinicalTrials(molecule.genericName, {
    countryFilter: 'United States',
    pageSize: 10,
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Fetch India trials
  const trialsIndia = await fetchClinicalTrials(molecule.genericName, {
    countryFilter: 'India',
    pageSize: 10,
  });

  // Determine modality
  let modality = 'small-molecule';
  if (molecule.name === 'Pembrolizumab' || molecule.name === 'Adalimumab') {
    modality = 'mAb';
  } else if (molecule.name === 'Semaglutide') {
    modality = 'peptide';
  }

  // Get launch year from FDA data
  let launchYear: number | undefined;
  if (fdaData) {
    const approvalDate = getOriginalApprovalDate(fdaData);
    if (approvalDate) {
      launchYear = approvalDate.getFullYear();
    }
  }

  return {
    molecule: {
      name: molecule.name,
      genericName: molecule.genericName,
      brandName: molecule.brandName,
      indication: molecule.indication,
      innovator: molecule.innovator,
      modality,
      launchYear,
    },
    fdaData,
    trialsUS,
    trialsIndia,
  };
}

/**
 * Fetch all data for all target molecules
 */
export async function fetchAllMoleculesData(): Promise<MoleculeData[]> {
  console.log('🚀 Starting data fetch from external APIs...\n');
  console.log(`Target molecules: ${TARGET_MOLECULES.map(m => m.name).join(', ')}\n`);

  const results: MoleculeData[] = [];

  for (const molecule of TARGET_MOLECULES) {
    try {
      const data = await fetchMoleculeData(molecule);
      results.push(data);
      
      // Summary
      console.log(`  ✅ ${molecule.name}: FDA=${data.fdaData ? 'Yes' : 'No'}, US Trials=${data.trialsUS.length}, India Trials=${data.trialsIndia.length}`);
      
      // Delay between molecules to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`  ❌ Error fetching ${molecule.name}:`, error.message);
    }
  }

  console.log(`\n✅ Completed fetching data for ${results.length} molecules`);
  return results;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate fetched data for completeness
 */
export function validateMoleculeData(data: MoleculeData): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!data.molecule.name) {
    issues.push('Missing molecule name');
  }
  if (!data.molecule.genericName) {
    issues.push('Missing generic name');
  }
  if (data.trialsUS.length === 0 && data.trialsIndia.length === 0) {
    issues.push('No clinical trials found');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

export default {
  fetchClinicalTrials,
  fetchFDADrugInfo,
  fetchMoleculeData,
  fetchAllMoleculesData,
  TARGET_MOLECULES,
};
