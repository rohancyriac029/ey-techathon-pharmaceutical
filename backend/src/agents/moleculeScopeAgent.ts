import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import { callGemini, extractJson } from '../services/geminiClient';
import { ExecutionPlan } from '../types/query';

const prisma = new PrismaClient();

export interface MoleculeScopeResult {
  selectedMolecules: string[];
  filterCriteria: {
    indication?: string;
    country?: string;
    modality?: string;
  };
  totalAvailable: number;
}

/**
 * Molecule Scope Agent - Selects relevant molecules based on query
 * 
 * This agent determines which molecules from the curated list
 * should be analyzed based on the user's query.
 */
export async function runMoleculeScopeAgent(
  plan: ExecutionPlan,
  jobId: string
): Promise<MoleculeScopeResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'MoleculeScopeAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Selecting molecules based on query criteria',
  });

  try {
    // Get all available molecules
    const allMolecules = await prisma.molecule.findMany();
    const totalAvailable = allMolecules.length;

    // Build filter criteria from execution plan
    const filterCriteria: {
      indication?: string;
      country?: string;
      modality?: string;
    } = {};

    let selectedMolecules: string[] = [];

    // If specific molecule requested, return just that
    if (plan.molecule) {
      const exactMatch = allMolecules.find(
        m => m.name.toLowerCase() === plan.molecule!.toLowerCase() ||
             m.brandName?.toLowerCase().includes(plan.molecule!.toLowerCase()) ||
             m.genericName?.toLowerCase() === plan.molecule!.toLowerCase()
      );
      if (exactMatch) {
        selectedMolecules = [exactMatch.name];
        await jobService.appendTraceEvent(jobId, {
          agent: 'MoleculeScopeAgent',
          status: 'completed',
          timestamp: new Date().toISOString(),
          detail: `Found specific molecule: ${exactMatch.name}`,
        });
        return { selectedMolecules, filterCriteria, totalAvailable };
      }
    }

    // Filter by indication/condition
    if (plan.condition) {
      // Map common condition names to our indication values (comprehensive mapping)
      const conditionMap: Record<string, string[]> = {
        // COPD / Respiratory
        'respiratory': ['COPD'],
        'copd': ['COPD'],
        'lung disease': ['COPD'],
        'chronic obstructive pulmonary disease': ['COPD'],
        'pulmonary': ['COPD'],
        
        // Diabetes
        'diabetes': ['Type 2 Diabetes'],
        'type 2 diabetes': ['Type 2 Diabetes'],
        't2d': ['Type 2 Diabetes'],
        'type 2': ['Type 2 Diabetes'],
        'type2': ['Type 2 Diabetes'],
        'diabetic': ['Type 2 Diabetes'],
        
        // Oncology / Cancer
        'cancer': ['NSCLC'],
        'oncology': ['NSCLC'],
        'nsclc': ['NSCLC'],
        'lung cancer': ['NSCLC'],
        'non-small cell lung cancer': ['NSCLC'],
        
        // Rheumatoid Arthritis
        'arthritis': ['Rheumatoid Arthritis'],
        'rheumatoid arthritis': ['Rheumatoid Arthritis'],
        'ra': ['Rheumatoid Arthritis'],
        'rheumatoid': ['Rheumatoid Arthritis'],
        'autoimmune': ['Rheumatoid Arthritis'],
        
        // Cardiovascular
        'cardiovascular': ['Cardiovascular'],
        'heart': ['Cardiovascular'],
        'cholesterol': ['Cardiovascular'],
        'lipid': ['Cardiovascular'],
        'statin': ['Cardiovascular'],
        'cv': ['Cardiovascular'],
        
        // Hypertension
        'hypertension': ['Hypertension'],
        'blood pressure': ['Hypertension'],
        'high blood pressure': ['Hypertension'],
        'htn': ['Hypertension'],
        'bp': ['Hypertension'],
      };

      const normalizedCondition = plan.condition.toLowerCase().trim();
      const matchingIndications = conditionMap[normalizedCondition] || [plan.condition];
      
      // Store the matched indication for filtering in other agents
      filterCriteria.indication = matchingIndications[0];

      const filteredByCondition = allMolecules.filter(m =>
        matchingIndications.some(ind => 
          m.indication.toLowerCase() === ind.toLowerCase() ||
          m.indication.toLowerCase().includes(ind.toLowerCase())
        )
      );

      if (filteredByCondition.length > 0) {
        selectedMolecules = filteredByCondition.map(m => m.name);
      } else {
        // No matches found for the specific condition - log warning but keep empty
        // This ensures we don't return unrelated data when condition doesn't match
        console.warn(`No molecules found for condition: ${plan.condition}`);
        selectedMolecules = [];
      }
    }

    // Only return all molecules if NO condition was specified in the query
    // If a condition was specified but no matches found, we should return empty
    // to avoid showing irrelevant data
    if (selectedMolecules.length === 0 && !plan.condition) {
      selectedMolecules = allMolecules.map(m => m.name);
    }

    // Store country preference in filter criteria (used by other agents)
    if (plan.country) {
      // Normalize country names
      const countryMap: Record<string, string> = {
        'india': 'IN',
        'in': 'IN',
        'usa': 'US',
        'us': 'US',
        'united states': 'US',
        'america': 'US',
      };
      filterCriteria.country = countryMap[plan.country.toLowerCase()] || plan.country;
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'MoleculeScopeAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Selected ${selectedMolecules.length}/${totalAvailable} molecules: ${selectedMolecules.join(', ')}`,
    });

    return {
      selectedMolecules,
      filterCriteria,
      totalAvailable,
    };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'MoleculeScopeAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
