import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import {
  CommercialDecisionAgentResult,
  MoleculeDecision,
  CountryRecommendation,
  CommercialStrategy,
  CommercialRisk,
  MoleculeFTOResult,
  ClinicalMaturityAssessment,
  MoleculeMarketAnalysis,
} from '../types/agent';

const prisma = new PrismaClient();

/**
 * Commercial Decision Agent - Final Business Recommendations
 * 
 * Decision Logic (per country):
 * 
 * LICENSE:
 *   - Patent still active (>3 years to expiry)
 *   - Strong clinical data (approved or Phase III)
 *   - Large market opportunity (>$1B)
 *   - Requires negotiating license from innovator
 * 
 * GENERIC:
 *   - Patents expired or expiring within 2 years
 *   - Approved in target market
 *   - Viable market size (>$500M)
 *   - Can enter immediately or soon
 * 
 * WAIT:
 *   - Patents expiring in 2-4 years
 *   - Good clinical profile
 *   - Worth preparing for future entry
 * 
 * DROP:
 *   - Patents block for >5 years
 *   - Poor clinical profile or market too small
 *   - Oncology specialty drugs (complex manufacturing, small patient population)
 */
export async function runCommercialDecisionAgent(
  ftoResults: MoleculeFTOResult[],
  clinicalResults: ClinicalMaturityAssessment[],
  marketResults: MoleculeMarketAnalysis[],
  jobId: string
): Promise<CommercialDecisionAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'CommercialDecisionAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: `Making commercial decisions for ${ftoResults.length} molecules`,
  });

  try {
    const decisions: MoleculeDecision[] = [];

    for (const fto of ftoResults) {
      const clinical = clinicalResults.find(c => c.molecule === fto.molecule);
      const market = marketResults.find(m => m.molecule === fto.molecule);

      if (!clinical || !market) {
        continue;
      }

      // Get molecule details
      const molecule = await prisma.molecule.findUnique({
        where: { name: fto.molecule },
      });

      const recommendations: CountryRecommendation[] = [];
      const countries: Array<'IN' | 'US'> = ['IN', 'US'];

      for (const country of countries) {
        const countryFTO = fto.byCountry.find(c => c.country === country);
        const countryRevenue = market.estimatedRevenueUSD[country];
        const countryMarketData = market.marketData.find(m => m.country === country);
        const regulatoryStatus = clinical.regulatoryStatus[country];
        const hasLocalTrials = clinical.hasLocalTrialData[country];

        if (!countryFTO) continue;

        let strategy: CommercialStrategy;
        let commercialRisk: CommercialRisk;
        let rationale: string;
        let goNoGo: 'GO' | 'NO-GO' | 'CONDITIONAL';
        const conditions: string[] = [];

        const yearsToEntry = countryFTO.yearsToGenericEntry;
        const marketSize = countryMarketData?.marketSizeUSD || 0;
        const isApproved = regulatoryStatus === 'Approved';
        const isOncology = market.indication === 'NSCLC';

        // Decision logic
        if (isOncology && yearsToEntry > 3) {
          // Oncology with long patents = DROP
          strategy = 'DROP';
          commercialRisk = 'HIGH';
          rationale = `Oncology drug with patents blocking until ${countryFTO.earliestGenericEntry}. ` +
            `Complex manufacturing and specialized market not suitable for generic entry.`;
          goNoGo = 'NO-GO';
        } else if (countryFTO.ftoStatus === 'CLEAR') {
          // Patents expired = GENERIC opportunity
          strategy = 'GENERIC';
          commercialRisk = isApproved ? 'LOW' : 'MEDIUM';
          rationale = `All patents expired in ${country}. ${
            isApproved ? 'Product already approved - immediate market entry possible.' :
            'File ANDA/generic application for market entry.'
          } Market size: $${(marketSize / 1_000_000_000).toFixed(1)}B.`;
          goNoGo = isApproved ? 'GO' : 'CONDITIONAL';
          if (!isApproved) conditions.push('Requires regulatory filing and approval');
        } else if (countryFTO.ftoStatus === 'EXPIRING_SOON' && yearsToEntry <= 2) {
          // Expiring soon = GENERIC (prepare now)
          strategy = 'GENERIC';
          commercialRisk = 'MEDIUM';
          rationale = `Patents expiring in ${yearsToEntry.toFixed(1)} years (${countryFTO.earliestGenericEntry}). ` +
            `Begin ANDA/generic development now for Day-1 launch. Market: $${(marketSize / 1_000_000_000).toFixed(1)}B.`;
          goNoGo = 'CONDITIONAL';
          conditions.push(`Wait for patent expiry: ${countryFTO.earliestGenericEntry}`);
          if (!isApproved) conditions.push('File regulatory application 12-18 months before patent expiry');
        } else if (yearsToEntry > 2 && yearsToEntry <= 4) {
          // Medium-term = WAIT
          strategy = 'WAIT';
          commercialRisk = 'MEDIUM';
          rationale = `Patents expire in ${yearsToEntry.toFixed(1)} years (${countryFTO.earliestGenericEntry}). ` +
            `Monitor patent landscape and begin planning for generic entry. Market: $${(marketSize / 1_000_000_000).toFixed(1)}B.`;
          goNoGo = 'CONDITIONAL';
          conditions.push(`Re-evaluate in ${Math.max(1, yearsToEntry - 2).toFixed(0)} years`);
          conditions.push('Track patent litigation and regulatory changes');
        } else if (yearsToEntry > 4 && marketSize >= 5_000_000_000 && clinical.maturityScore >= 70) {
          // Long patents but huge market with good clinical = LICENSE
          strategy = 'LICENSE';
          commercialRisk = 'HIGH';
          rationale = `Large market opportunity ($${(marketSize / 1_000_000_000).toFixed(1)}B) with patents blocking until ${countryFTO.earliestGenericEntry}. ` +
            `Consider licensing deal with ${molecule?.innovatorCompany || 'innovator'} for early market access.`;
          goNoGo = 'CONDITIONAL';
          conditions.push(`Negotiate license with ${molecule?.innovatorCompany || 'patent holder'}`);
          conditions.push('Conduct detailed commercial feasibility study');
        } else {
          // Default: DROP (patents too long, market too small, or poor clinical profile)
          strategy = 'DROP';
          commercialRisk = 'HIGH';
          rationale = `Patents block entry until ${countryFTO.earliestGenericEntry} (${yearsToEntry.toFixed(1)} years). ` +
            (marketSize < 1_000_000_000 ? 'Market size insufficient for investment. ' :
             clinical.maturityScore < 50 ? 'Clinical profile requires further development. ' :
             'Economics do not support licensing or waiting. ') +
            'Recommend focusing resources elsewhere.';
          goNoGo = 'NO-GO';
        }

        // Time to market calculation
        let timeToMarketYears = yearsToEntry;
        if (strategy === 'GENERIC' && countryFTO.ftoStatus === 'CLEAR') {
          timeToMarketYears = isApproved ? 0.5 : 2; // 6 months if approved, 2 years for new filing
        } else if (strategy === 'LICENSE') {
          timeToMarketYears = 1.5; // License negotiation + launch
        }

        recommendations.push({
          country,
          strategy,
          timeToMarketYears,
          estimatedRevenueUSD: countryRevenue,
          commercialRisk,
          rationale,
          goNoGo,
          conditions: conditions.length > 0 ? conditions : undefined,
        });
      }

      // Determine overall strategy (prioritize by best opportunity)
      const strategyPriority: Record<CommercialStrategy, number> = {
        'GENERIC': 1,
        'LICENSE': 2,
        'WAIT': 3,
        'DROP': 4,
      };

      const bestRecommendation = recommendations.reduce((best, curr) =>
        strategyPriority[curr.strategy] < strategyPriority[best.strategy] ? curr : best
      );

      const overallStrategy = bestRecommendation.strategy;
      const overallRisk = recommendations.some(r => r.commercialRisk === 'HIGH') ? 'HIGH' :
        recommendations.some(r => r.commercialRisk === 'MEDIUM') ? 'MEDIUM' : 'LOW';

      // Build summaries
      const ftoSummary = fto.byCountry.map(c =>
        `${c.country}: ${c.ftoStatus === 'CLEAR' ? 'Patents expired' :
          c.ftoStatus === 'EXPIRING_SOON' ? `Expiring ${c.earliestGenericEntry}` :
          `Blocked until ${c.earliestGenericEntry}`}`
      ).join('. ');

      const clinicalSummary = `${clinical.highestPhaseCompleted} completed. ` +
        `Approved: IN=${clinical.regulatoryStatus.IN}, US=${clinical.regulatoryStatus.US}. ` +
        `Maturity: ${clinical.maturityScore}/100.`;

      const marketSummary = `$${(market.totalAddressableMarketUSD / 1_000_000_000).toFixed(1)}B total addressable market. ` +
        `IN: $${(market.estimatedRevenueUSD.IN / 1_000_000).toFixed(0)}M potential. ` +
        `US: $${(market.estimatedRevenueUSD.US / 1_000_000).toFixed(0)}M potential.`;

      // Extract patent details for transparency
      const patentDetails = {
        IN: {
          blocking: fto.byCountry.find(c => c.country === 'IN')?.blockingPatents || [],
          expired: fto.byCountry.find(c => c.country === 'IN')?.expiredPatents || [],
        },
        US: {
          blocking: fto.byCountry.find(c => c.country === 'US')?.blockingPatents || [],
          expired: fto.byCountry.find(c => c.country === 'US')?.expiredPatents || [],
        },
      };

      decisions.push({
        molecule: fto.molecule,
        brandName: molecule?.brandName || undefined,
        indication: market.indication,
        innovator: molecule?.innovatorCompany || 'Unknown',
        modality: molecule?.modality || 'Unknown',
        recommendations,
        overallStrategy,
        overallRisk,
        priorityRank: 0, // Will be set after sorting
        ftoSummary,
        clinicalSummary,
        marketSummary,
        patentDetails,
        earliestEntryIN: fto.byCountry.find(c => c.country === 'IN')?.earliestGenericEntry,
        earliestEntryUS: fto.byCountry.find(c => c.country === 'US')?.earliestGenericEntry,
      });
    }

    // Sort by strategy priority and market potential, then assign ranks
    decisions.sort((a, b) => {
      const stratPriority: Record<CommercialStrategy, number> = {
        'GENERIC': 1, 'LICENSE': 2, 'WAIT': 3, 'DROP': 4
      };
      const stratDiff = stratPriority[a.overallStrategy] - stratPriority[b.overallStrategy];
      if (stratDiff !== 0) return stratDiff;

      // Within same strategy, sort by total revenue potential
      const aRevenue = a.recommendations.reduce((sum, r) => sum + r.estimatedRevenueUSD, 0);
      const bRevenue = b.recommendations.reduce((sum, r) => sum + r.estimatedRevenueUSD, 0);
      return bRevenue - aRevenue;
    });

    decisions.forEach((d, i) => d.priorityRank = i + 1);

    // Build summary
    const summary = {
      totalMolecules: decisions.length,
      licenseOpportunities: decisions.filter(d => d.overallStrategy === 'LICENSE').length,
      genericOpportunities: decisions.filter(d => d.overallStrategy === 'GENERIC').length,
      waitOpportunities: decisions.filter(d => d.overallStrategy === 'WAIT').length,
      dropRecommendations: decisions.filter(d => d.overallStrategy === 'DROP').length,
    };

    await jobService.appendTraceEvent(jobId, {
      agent: 'CommercialDecisionAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Decisions: ${summary.genericOpportunities} GENERIC, ${summary.licenseOpportunities} LICENSE, ` +
        `${summary.waitOpportunities} WAIT, ${summary.dropRecommendations} DROP`,
    });

    return { decisions, summary };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'CommercialDecisionAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
