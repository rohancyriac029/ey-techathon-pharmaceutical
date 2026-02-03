import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import {
  EpidemiologyMarketAgentResult,
  MoleculeMarketAnalysis,
  DiseaseMarketData,
  DrugPricingInfo,
  CompetitionInfo,
} from '../types/agent';
import { calculateAdjustedMarketShare } from '../services/marketDataService';

const prisma = new PrismaClient();

/**
 * Epidemiology & Market Agent - Enhanced Market Size and Revenue Analysis
 * 
 * Key Business Logic:
 * - Market Size = Prevalence × Treated Rate × Annual Therapy Cost
 * - Revenue estimate based on REAL competition data (FDA Orange Book, CDSCO)
 * - Uses actual drug pricing from CMS Medicare Part D and NPPA
 * - Market attractiveness considers size, growth potential, AND competition intensity
 * 
 * Data Sources:
 * - CMS Medicare Part D (US drug spending and pricing)
 * - FDA Orange Book (US generic competition)
 * - NPPA (India ceiling prices)
 * - CDSCO (India generic approvals)
 * - IQVIA/Evaluate Pharma (Market growth projections)
 */
export async function runEpidemiologyMarketAgent(
  moleculeNames: string[],
  jobId: string
): Promise<EpidemiologyMarketAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'EpidemiologyMarketAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: `Analyzing market opportunity for ${moleculeNames.length} molecules with real pricing & competition data`,
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

      // NEW: Fetch market growth data
      const growthRecords = await prisma.marketGrowth.findMany({
        where: { disease: indication },
      }).catch(() => []);  // Gracefully handle if table doesn't exist yet

      // NEW: Fetch drug-specific pricing data
      const pricingRecords = await prisma.drugPricing.findMany({
        where: { molecule: moleculeName },
      }).catch(() => []);

      // NEW: Fetch generic competition data
      const competitionRecords = await prisma.genericCompetition.findMany({
        where: { molecule: moleculeName },
      }).catch(() => []);

      const marketData: DiseaseMarketData[] = [];
      const pricingData: DrugPricingInfo[] = [];
      const competitionData: CompetitionInfo[] = [];
      const estimatedRevenueUSD: Record<'IN' | 'US', number> = { IN: 0, US: 0 };
      const adjustedMarketShare: Record<'IN' | 'US', number> = { IN: 0, US: 0 };
      const revenueExplanation: Record<'IN' | 'US', string> = { IN: '', US: '' };
      const marketAttractiveness: Record<'IN' | 'US', 'HIGH' | 'MEDIUM' | 'LOW'> = {
        IN: 'LOW',
        US: 'LOW',
      };
      let totalAddressableMarketUSD = 0;

      // Process market data for each country
      for (const record of marketRecords) {
        const country = record.country as 'IN' | 'US';
        
        // Get growth data for this country
        const growthData = growthRecords.find(g => g.country === country);
        
        // Calculate market size if not already set
        const calculatedMarketSize = record.marketSizeUSD || 
          (record.prevalenceMillions * (record.treatedRatePercent / 100) * record.avgAnnualTherapyCostUSD * 1_000_000);

        const marketDataEntry: DiseaseMarketData = {
          disease: record.disease,
          country,
          year: record.year,
          prevalenceMillions: record.prevalenceMillions,
          incidenceMillions: record.incidenceMillions,
          treatedRatePercent: record.treatedRatePercent,
          avgAnnualTherapyCostUSD: record.avgAnnualTherapyCostUSD,
          marketSizeUSD: calculatedMarketSize,
          dataSource: record.dataSource || undefined,
          cagr5YearProjected: growthData?.cagr5YearProjected || undefined,
          genericErosionRate: growthData?.genericErosionRate || undefined,
        };

        marketData.push(marketDataEntry);
        totalAddressableMarketUSD += calculatedMarketSize;

        // Get competition data for this country
        const countryCompetition = competitionRecords.find(c => c.country === country);
        
        // Get pricing data for this country
        const countryPricing = pricingRecords.find(p => p.country === country);

        // Calculate market share based on REAL competition data
        let marketSharePct: number;
        let explanation: string;

        if (countryCompetition) {
          // Use real competition data to calculate market share
          const competitionIntensity = countryCompetition.competitionIntensity as 'LOW' | 'MEDIUM' | 'HIGH';
          const genericApprovals = countryCompetition.genericApprovals;
          const genericPenetration = countryCompetition.genericPenetrationPct || 0;
          
          if (competitionIntensity === 'LOW') {
            // Low competition - can capture more market
            marketSharePct = 15;
            explanation = `Low competition (${genericApprovals} generic approvals). Estimated ${marketSharePct}% market share achievable.`;
          } else if (competitionIntensity === 'MEDIUM') {
            // Medium competition
            marketSharePct = 8;
            explanation = `Medium competition (${genericApprovals} generics, ${countryCompetition.activeManufacturers} active manufacturers). Estimated ${marketSharePct}% share.`;
          } else {
            // High competition - share depends on number of players
            if (genericApprovals <= 10) {
              marketSharePct = 5;
            } else if (genericApprovals <= 20) {
              marketSharePct = 3;
            } else {
              marketSharePct = 2;
            }
            explanation = `High competition (${genericApprovals} generics, ${countryCompetition.activeManufacturers} manufacturers). Realistic share: ${marketSharePct}%.`;
          }
          
          // If generic market exists, we compete in that segment
          if (genericPenetration > 0) {
            const genericMarketSize = calculatedMarketSize * (genericPenetration / 100);
            estimatedRevenueUSD[country] = Math.round(genericMarketSize * (marketSharePct / 100));
            explanation += ` Generic segment: ${genericPenetration}% of market ($${(genericMarketSize / 1_000_000_000).toFixed(2)}B).`;
          } else {
            // Brand market - need licensing
            estimatedRevenueUSD[country] = Math.round(calculatedMarketSize * (marketSharePct / 100));
            explanation += ' Brand-only market - licensing required for entry.';
          }
        } else {
          // Fallback to old logic if no competition data
          marketSharePct = country === 'IN' ? 8 : 6;
          explanation = `Estimated ${marketSharePct}% market share (no detailed competition data available).`;
          estimatedRevenueUSD[country] = Math.round(calculatedMarketSize * (marketSharePct / 100));
        }

        adjustedMarketShare[country] = marketSharePct;
        revenueExplanation[country] = explanation;

        // Determine market attractiveness (considering competition)
        const attractivenessScore = calculateMarketAttractiveness(
          calculatedMarketSize,
          countryCompetition?.competitionIntensity as 'LOW' | 'MEDIUM' | 'HIGH' | undefined,
          growthData?.cagr5YearProjected ?? undefined
        );
        marketAttractiveness[country] = attractivenessScore;
      }

      // Build pricing data array
      for (const pricing of pricingRecords) {
        pricingData.push({
          country: pricing.country as 'IN' | 'US',
          year: pricing.year,
          totalSpendingUSD: pricing.totalSpendingUSD || undefined,
          totalClaims: pricing.totalClaims || undefined,
          brandPriceUSD: pricing.brandPriceUSD || undefined,
          genericPriceUSD: pricing.genericPriceUSD || undefined,
          priceErosionPct: pricing.priceErosionPct || undefined,
          dataSource: pricing.dataSource,
          dataConfidence: pricing.dataConfidence as 'HIGH' | 'MEDIUM' | 'LOW',
        });
      }

      // Build competition data array
      for (const competition of competitionRecords) {
        let topCompetitors: string[] | undefined;
        try {
          if (competition.topCompetitors) {
            topCompetitors = JSON.parse(competition.topCompetitors);
          }
        } catch {
          topCompetitors = undefined;
        }

        competitionData.push({
          country: competition.country as 'IN' | 'US',
          genericApprovals: competition.genericApprovals,
          biosimilarApprovals: competition.biosimilarApprovals,
          activeManufacturers: competition.activeManufacturers,
          topCompetitors,
          firstGenericDate: competition.firstGenericDate?.toISOString().split('T')[0],
          brandMarketSharePct: competition.brandMarketSharePct || undefined,
          genericPenetrationPct: competition.genericPenetrationPct || undefined,
          competitionIntensity: competition.competitionIntensity as 'LOW' | 'MEDIUM' | 'HIGH',
          dataSource: competition.dataSource,
        });
      }

      molecules.push({
        molecule: moleculeName,
        indication,
        marketData,
        estimatedRevenueUSD,
        marketAttractiveness,
        totalAddressableMarketUSD,
        // NEW: Enhanced data
        pricingData: pricingData.length > 0 ? pricingData : undefined,
        competitionData: competitionData.length > 0 ? competitionData : undefined,
        adjustedMarketShare,
        revenueExplanation,
      });
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'EpidemiologyMarketAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Analyzed ${molecules.length} molecules with real competition data. Total addressable market: $${
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

/**
 * Calculate market attractiveness considering size, competition, and growth
 */
function calculateMarketAttractiveness(
  marketSize: number,
  competitionIntensity?: 'LOW' | 'MEDIUM' | 'HIGH',
  projectedGrowth?: number
): 'HIGH' | 'MEDIUM' | 'LOW' {
  let score = 0;

  // Size component (0-40 points)
  if (marketSize >= 10_000_000_000) score += 40;       // >$10B
  else if (marketSize >= 5_000_000_000) score += 30;   // $5-10B
  else if (marketSize >= 1_000_000_000) score += 20;   // $1-5B
  else if (marketSize >= 500_000_000) score += 10;     // $500M-1B
  else score += 0;                                      // <$500M

  // Competition component (0-30 points) - less competition = more attractive
  if (competitionIntensity === 'LOW') score += 30;
  else if (competitionIntensity === 'MEDIUM') score += 15;
  else if (competitionIntensity === 'HIGH') score += 5;
  else score += 15; // Default if no data

  // Growth component (0-30 points)
  if (projectedGrowth !== undefined) {
    if (projectedGrowth >= 10) score += 30;      // >10% CAGR
    else if (projectedGrowth >= 5) score += 20;  // 5-10% CAGR
    else if (projectedGrowth >= 2) score += 10;  // 2-5% CAGR
    else score += 0;                              // <2% CAGR
  } else {
    score += 10; // Default if no growth data
  }

  // Convert score to attractiveness level
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}
