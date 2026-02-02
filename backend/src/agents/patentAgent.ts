import { patentDataService } from '../services/patentDataService';
import { jobService } from '../services/jobService';
import { PatentAgentResult, MoleculePatentData, PatentCliffData, PatentCliffEntry } from '../types/agent';
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
    
    // Map country name to country code (new schema uses 'country' not 'jurisdiction')
    if (plan.country) {
      const countryToCode: Record<string, string> = {
        'India': 'IN',
        'USA': 'US',
        'United States': 'US',
        'US': 'US',
        'IN': 'IN',
      };
      const countryCode = countryToCode[plan.country];
      if (countryCode) filters.country = countryCode;
    }

    // Query database
    const patents = await patentDataService.findPatents(filters);
    
    // If no specific filters, get all patents
    const allPatents = patents.length > 0 ? patents : await patentDataService.getAllPatents();

    const now = new Date();
    
    // Helper: Calculate FTO based on expiry date
    const calculateFto = (expiryDate: Date): 'LOW' | 'MEDIUM' | 'HIGH' => {
      const diffYears = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      if (diffYears <= 0) return 'LOW';      // Expired - safe to develop
      if (diffYears <= 3) return 'MEDIUM';   // Expiring within 3 years - proceed with caution
      return 'HIGH';                          // More than 3 years - blocked
    };
    
    // Helper: Calculate years to expiry
    const calculateYearsToExpiry = (expiryDate: Date): number => {
      const diffYears = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.round(diffYears * 10) / 10; // Round to 1 decimal
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
      
      // Use 'country' field (new schema) instead of 'jurisdiction'
      const jurisdiction = patent.country;
      // Use 'patentNumber' as citation (new schema doesn't have citations)
      const citation = patent.patentNumber;
      
      if (existing) {
        if (!existing.jurisdictions.includes(jurisdiction)) {
          existing.jurisdictions.push(jurisdiction);
        }
        // Update to earliest expiry (for display)
        if (expiryDateStr < existing.earliestExpiry) {
          existing.earliestExpiry = expiryDateStr;
        }
        // Track latest expiry (for FTO calculation - the blocking patent)
        if (expiryDateObj > existing.latestExpiry) {
          existing.latestExpiry = expiryDateObj;
        }
        if (!existing.citations.includes(citation)) {
          existing.citations.push(citation);
        }
      } else {
        moleculeMap.set(patent.molecule, {
          molecule: patent.molecule,
          jurisdictions: [jurisdiction],
          earliestExpiry: expiryDateStr,
          latestExpiry: expiryDateObj,
          citations: [citation],
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
      yearsToExpiry: calculateYearsToExpiry(m.latestExpiry),
    }));

    // ============================================
    // NEW: Patent Cliff Radar
    // ============================================
    const patentCliff: PatentCliffData = {
      alreadyExpired: [],
      expiring1Year: [],
      expiring3Years: [],
      expiring5Years: [],
    };

    for (const mol of byMolecule) {
      const entry: PatentCliffEntry = {
        molecule: mol.molecule,
        latestExpiry: mol.latestExpiry,
        jurisdictions: mol.jurisdictions,
        yearsToExpiry: mol.yearsToExpiry,
      };

      if (mol.yearsToExpiry <= 0) {
        patentCliff.alreadyExpired.push(entry);
      } else if (mol.yearsToExpiry <= 1) {
        patentCliff.expiring1Year.push(entry);
      } else if (mol.yearsToExpiry <= 3) {
        patentCliff.expiring3Years.push(entry);
      } else if (mol.yearsToExpiry <= 5) {
        patentCliff.expiring5Years.push(entry);
      }
    }

    // Sort each cliff by years to expiry
    patentCliff.expiring1Year.sort((a, b) => a.yearsToExpiry - b.yearsToExpiry);
    patentCliff.expiring3Years.sort((a, b) => a.yearsToExpiry - b.yearsToExpiry);
    patentCliff.expiring5Years.sort((a, b) => a.yearsToExpiry - b.yearsToExpiry);

    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: `Found ${byMolecule.length} molecules with patents, analyzing FTO risk and patent cliff`,
    });

    // Log completion
    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Processed ${allPatents.length} patents across ${byMolecule.length} molecules. Patent cliff: ${patentCliff.expiring1Year.length} expiring in 1yr, ${patentCliff.expiring3Years.length} in 3yrs`,
    });

    return { byMolecule, patentCliff };
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
