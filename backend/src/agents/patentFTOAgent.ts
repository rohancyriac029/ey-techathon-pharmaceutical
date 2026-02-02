import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import {
  PatentFTOAgentResult,
  MoleculeFTOResult,
  CountryFTOAnalysis,
  PatentInfo,
  FTOStatus,
} from '../types/agent';

const prisma = new PrismaClient();

/**
 * Patent FTO Agent - Country-Specific Freedom to Operate Analysis
 * 
 * Key Business Logic:
 * - FTO is calculated PER COUNTRY (IN vs US have different patent landscapes)
 * - Primary patents (compound/NCE) are the main barrier
 * - Secondary patents (formulation/process) can extend exclusivity
 * - Generic entry = expiry of LATEST blocking patent in that country
 */
export async function runPatentFTOAgent(
  moleculeNames: string[],
  jobId: string
): Promise<PatentFTOAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'PatentFTOAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: `Analyzing FTO for ${moleculeNames.length} molecules across IN/US`,
  });

  try {
    const molecules: MoleculeFTOResult[] = [];
    const now = new Date();
    const countries: Array<'IN' | 'US'> = ['IN', 'US'];

    for (const moleculeName of moleculeNames) {
      // Fetch all patents for this molecule
      const patents = await prisma.patent.findMany({
        where: { molecule: moleculeName },
        orderBy: { expiryDate: 'asc' },
      });

      const byCountry: CountryFTOAnalysis[] = [];
      let overallFTO: FTOStatus = 'CLEAR';
      let primaryPatentExpired = true;
      let hasSecondaryBlocking = false;

      for (const country of countries) {
        const countryPatents = patents.filter(p => p.country === country);
        
        if (countryPatents.length === 0) {
          // No patents in this country = CLEAR
          byCountry.push({
            country,
            ftoStatus: 'CLEAR',
            earliestGenericEntry: now.toISOString().split('T')[0],
            yearsToGenericEntry: 0,
            blockingPatents: [],
            expiredPatents: [],
            riskExplanation: `No patents found in ${country}. Generic entry possible immediately.`,
          });
          continue;
        }

        const blockingPatents: PatentInfo[] = [];
        const expiredPatents: PatentInfo[] = [];
        let latestBlockingExpiry: Date | null = null;
        let hasPrimaryExpired = false;
        let hasPrimaryActive = false;

        for (const patent of countryPatents) {
          const expiryDate = new Date(patent.expiryDate);
          const isExpired = expiryDate <= now;

          const patentInfo: PatentInfo = {
            patentNumber: patent.patentNumber,
            patentType: patent.patentType as 'COMPOUND' | 'FORMULATION' | 'PROCESS' | 'SECONDARY',
            isPrimary: patent.isPrimary,
            expiryDate: expiryDate.toISOString().split('T')[0],
            status: isExpired ? 'Expired' : 'Active',
            title: patent.title || undefined,
          };

          if (isExpired) {
            expiredPatents.push(patentInfo);
            if (patent.isPrimary) hasPrimaryExpired = true;
          } else {
            blockingPatents.push(patentInfo);
            if (patent.isPrimary) hasPrimaryActive = true;
            
            // Track latest blocking patent
            if (!latestBlockingExpiry || expiryDate > latestBlockingExpiry) {
              latestBlockingExpiry = expiryDate;
            }

            // Track secondary blocking
            if (!patent.isPrimary) {
              hasSecondaryBlocking = true;
            }
          }
        }

        // Determine FTO status for this country
        let ftoStatus: FTOStatus;
        let yearsToGenericEntry: number;
        let earliestGenericEntry: string;
        let riskExplanation: string;

        if (blockingPatents.length === 0) {
          ftoStatus = 'CLEAR';
          yearsToGenericEntry = 0;
          earliestGenericEntry = now.toISOString().split('T')[0];
          riskExplanation = `All patents expired in ${country}. Generic entry possible immediately.`;
        } else {
          yearsToGenericEntry = Math.round(
            ((latestBlockingExpiry!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)) * 10
          ) / 10;
          earliestGenericEntry = latestBlockingExpiry!.toISOString().split('T')[0];

          if (yearsToGenericEntry <= 2) {
            ftoStatus = 'EXPIRING_SOON';
            riskExplanation = `Patents expiring within ${yearsToGenericEntry.toFixed(1)} years in ${country}. ` +
              `${blockingPatents.length} active patent(s) blocking. ` +
              (hasPrimaryActive ? 'Primary compound patent still active.' : 'Only secondary patents remaining.');
          } else {
            ftoStatus = 'BLOCKED';
            riskExplanation = `Patents block entry until ${earliestGenericEntry} in ${country} (${yearsToGenericEntry.toFixed(1)} years). ` +
              `${blockingPatents.length} active patent(s). ` +
              (hasPrimaryActive ? 'Primary compound patent active.' : 'Secondary patents extend exclusivity.');
          }

          // Update overall FTO (worst case)
          if (ftoStatus === 'BLOCKED') overallFTO = 'BLOCKED';
          else if (ftoStatus === 'EXPIRING_SOON' && overallFTO !== 'BLOCKED') overallFTO = 'EXPIRING_SOON';
        }

        // Track primary patent status
        if (hasPrimaryActive) primaryPatentExpired = false;

        byCountry.push({
          country,
          ftoStatus,
          earliestGenericEntry,
          yearsToGenericEntry,
          blockingPatents,
          expiredPatents,
          riskExplanation,
        });
      }

      molecules.push({
        molecule: moleculeName,
        byCountry,
        overallFTO,
        primaryPatentExpired,
        hasSecondaryBlocking,
      });
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentFTOAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Analyzed ${molecules.length} molecules: ${molecules.filter(m => m.overallFTO === 'CLEAR').length} CLEAR, ` +
        `${molecules.filter(m => m.overallFTO === 'EXPIRING_SOON').length} EXPIRING_SOON, ` +
        `${molecules.filter(m => m.overallFTO === 'BLOCKED').length} BLOCKED`,
    });

    return { molecules };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'PatentFTOAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
