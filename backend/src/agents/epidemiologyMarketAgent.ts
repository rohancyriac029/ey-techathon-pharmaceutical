import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import {
  EpidemiologyMarketAgentResult,
  MoleculeMarketAnalysis,
  DiseaseMarketData,
} from '../types/agent';

const prisma = new PrismaClient();

/**
 * Epidemiology & Market Agent - Market Size and Revenue Analysis
 * 
 * Key Business Logic:
 * - Market Size = Prevalence × Treated Rate × Annual Therapy Cost
 * - Revenue estimate based on realistic market share assumptions
 * - Market attractiveness considers size, growth potential, and competition
 */
export async function runEpidemiologyMarketAgent(
  moleculeNames: string[],
  jobId: string
): Promise<EpidemiologyMarketAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'EpidemiologyMarketAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: `Analyzing market opportunity for ${moleculeNames.length} molecules`,
  });

  try {
    const molecules: MoleculeMarketAnalysis[] = [];

    for (const moleculeName of moleculeNames) {
      // Fetch molecule info to get indication
      const molecule = await prisma.molecule.findUnique({
        where: { name: moleculeName },
      });

      if (!molecule) {
        continue;
      }

      const indication = molecule.indication;

      // Fetch disease market data for this indication
      const marketRecords = await prisma.diseaseMarket.findMany({
        where: { disease: indication },
      });

      const marketData: DiseaseMarketData[] = [];
      const estimatedRevenueUSD: Record<'IN' | 'US', number> = { IN: 0, US: 0 };
      const marketAttractiveness: Record<'IN' | 'US', 'HIGH' | 'MEDIUM' | 'LOW'> = {
        IN: 'LOW',
        US: 'LOW',
      };
      let totalAddressableMarketUSD = 0;

      for (const record of marketRecords) {
        // Calculate market size if not already set
        const calculatedMarketSize = record.marketSizeUSD || 
          (record.prevalenceMillions * (record.treatedRatePercent / 100) * record.avgAnnualTherapyCostUSD * 1_000_000);

        const marketDataEntry: DiseaseMarketData = {
          disease: record.disease,
          country: record.country as 'IN' | 'US',
          year: record.year,
          prevalenceMillions: record.prevalenceMillions,
          incidenceMillions: record.incidenceMillions,
          treatedRatePercent: record.treatedRatePercent,
          avgAnnualTherapyCostUSD: record.avgAnnualTherapyCostUSD,
          marketSizeUSD: calculatedMarketSize,
          dataSource: record.dataSource || undefined,
        };

        marketData.push(marketDataEntry);

        // Calculate estimated revenue (assume 5-15% market share based on entry timing)
        // Generic entry: 5-10% share, License entry: 10-15% share
        const country = record.country as 'IN' | 'US';
        const marketShareAssumption = country === 'IN' ? 0.08 : 0.06; // 8% IN, 6% US
        estimatedRevenueUSD[country] = Math.round(calculatedMarketSize * marketShareAssumption);

        totalAddressableMarketUSD += calculatedMarketSize;

        // Determine market attractiveness
        // High: >$5B market, Medium: $1-5B, Low: <$1B
        if (calculatedMarketSize >= 5_000_000_000) {
          marketAttractiveness[country] = 'HIGH';
        } else if (calculatedMarketSize >= 1_000_000_000) {
          marketAttractiveness[country] = 'MEDIUM';
        } else {
          marketAttractiveness[country] = 'LOW';
        }
      }

      molecules.push({
        molecule: moleculeName,
        indication,
        marketData,
        estimatedRevenueUSD,
        marketAttractiveness,
        totalAddressableMarketUSD,
      });
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'EpidemiologyMarketAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Analyzed ${molecules.length} molecules. Total addressable market: $${
        (molecules.reduce((sum, m) => sum + m.totalAddressableMarketUSD, 0) / 1_000_000_000).toFixed(1)
      }B`,
    });

    return { molecules };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'EpidemiologyMarketAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
