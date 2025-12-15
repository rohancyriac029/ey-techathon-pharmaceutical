import { patentDataService } from '../services/patentDataService';
import { jobService } from '../services/jobService';
import { PatentAgentResult, MoleculePatentData } from '../types/agent';
import { ExecutionPlan } from '../types/query';

export async function runPatentAgent(
  plan: ExecutionPlan,
  jobId: string
): Promise<PatentAgentResult> {
  // Log start
  await jobService.appendTraceEvent(jobId, {
    agent: 'PatentAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Querying patent database',
  });

  try {
    // Build filters from plan
    const filters: any = {};
    if (plan.molecule) filters.molecule = plan.molecule;
    
    // Map country to jurisdiction
    if (plan.country) {
      const countryToJurisdiction: Record<string, string> = {
        'India': 'IN',
        'USA': 'US',
        'United States': 'US',
        'Europe': 'EP',
        'China': 'CN',
        'Japan': 'JP',
        'UK': 'GB',
        'Germany': 'DE',
      };
      const jurisdiction = countryToJurisdiction[plan.country];
      if (jurisdiction) filters.jurisdiction = jurisdiction;
    }

    // Query database
    const patents = await patentDataService.findPatents(filters);
    
    // If no specific filters, get all patents
    const allPatents = patents.length > 0 ? patents : await patentDataService.getAllPatents();

    // Helper: Calculate FTO based on expiry date
    const calculateFto = (expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' => {
      const now = new Date();
      const diffYears = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (diffYears <= 0) return 'LOW';      // Expired - safe to develop
      if (diffYears <= 3) return 'MEDIUM';   // Expiring within 3 years - proceed with caution
      return 'HIGH';                          // More than 3 years - blocked
    };

    // Group by molecule - track both earliest and latest expiry
    const moleculeMap = new Map<string, {
      molecule: string;
      jurisdictions: string[];
      earliestExpiry: string;
      latestExpiry: Date;
      citations: string[];
    }>();

    for (const patent of allPatents) {
      const existing = moleculeMap.get(patent.molecule);
      const expiryDateObj = new Date(patent.expiryDate);
      const expiryDateStr = expiryDateObj.toISOString().split('T')[0];
      
      if (existing) {
        if (!existing.jurisdictions.includes(patent.jurisdiction)) {
          existing.jurisdictions.push(patent.jurisdiction);
        }
        // Update to earliest expiry (for display)
        if (expiryDateStr < existing.earliestExpiry) {
          existing.earliestExpiry = expiryDateStr;
        }
        // Track latest expiry (for FTO calculation - the blocking patent)
        if (expiryDateObj > existing.latestExpiry) {
          existing.latestExpiry = expiryDateObj;
        }
        if (!existing.citations.includes(patent.citations)) {
          existing.citations.push(patent.citations);
        }
      } else {
        moleculeMap.set(patent.molecule, {
          molecule: patent.molecule,
          jurisdictions: [patent.jurisdiction],
          earliestExpiry: expiryDateStr,
          latestExpiry: expiryDateObj,
          citations: [patent.citations],
        });
      }
    }

    // Calculate FTO based on LATEST expiry (the patent that blocks you longest)
    const byMolecule: MoleculePatentData[] = Array.from(moleculeMap.values()).map(m => ({
      molecule: m.molecule,
      jurisdictions: m.jurisdictions,
      earliestExpiry: m.earliestExpiry,
      latestExpiry: m.latestExpiry.toISOString().split('T')[0],
      ftoFlag: calculateFto(m.latestExpiry),
      citations: m.citations,
    }));

    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: `Found ${byMolecule.length} molecules with patents, analyzing FTO risk`,
    });

    // Log completion
    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Processed ${allPatents.length} patents across ${byMolecule.length} molecules`,
    });

    return { byMolecule };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
