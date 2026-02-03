import { PrismaClient } from '@prisma/client';
import { callGemini } from '../services/geminiClient';
import { pdfService } from '../services/pdfService';
import { jobService } from '../services/jobService';
import { 
  MoleculeDecision,
  PatentFTOAgentResult,
  ClinicalMaturityAgentResult,
  EpidemiologyMarketAgentResult,
  CommercialStrategy,
} from '../types/agent';
import { ReportPayload } from '../types/report';

const prisma = new PrismaClient();

/**
 * Generate a detailed fallback summary when AI is unavailable
 */
function generateFallbackSummary(
  queryText: string,
  decisionSummary: { totalMolecules: number; genericOpportunities: number; licenseOpportunities: number; waitOpportunities: number; dropRecommendations: number },
  totalAddressableMarketUSD: number,
  strategySummary: { generic: string[]; license: string[]; wait: string[]; drop: string[] },
  topDecisions: MoleculeDecision[],
  filterCriteria: { indication?: string; country?: string }
): string {
  const marketB = (totalAddressableMarketUSD / 1_000_000_000).toFixed(1);
  const indication = filterCriteria.indication || 'multiple therapeutic areas';
  
  // Build a rich summary based on the actual data
  let summary = `**Executive Summary: ${indication} Market Analysis**\n\n`;
  
  summary += `This analysis evaluated ${decisionSummary.totalMolecules} molecules for ${indication}, `;
  summary += `representing a total addressable market of $${marketB} billion across India and US markets. `;
  
  if (decisionSummary.genericOpportunities > 0) {
    const topGenerics = strategySummary.generic.slice(0, 3);
    summary += `\n\n**Generic Opportunities (${decisionSummary.genericOpportunities} molecules):** `;
    summary += `Key candidates include ${topGenerics.join(', ')}. `;
    
    // Find the top generic decision for more details
    const topGenericDecision = topDecisions.find(d => d.overallStrategy === 'GENERIC');
    if (topGenericDecision) {
      summary += `${topGenericDecision.molecule} presents an immediate opportunity with `;
      summary += `${topGenericDecision.overallRisk} risk profile. `;
    }
  }
  
  if (decisionSummary.licenseOpportunities > 0) {
    const topLicenses = strategySummary.license.slice(0, 3);
    summary += `\n\n**Licensing Opportunities (${decisionSummary.licenseOpportunities} molecules):** `;
    summary += `Molecules suitable for licensing include ${topLicenses.join(', ')}. `;
    summary += `These represent patent-protected assets requiring partnership or in-licensing strategies.`;
  }
  
  if (decisionSummary.dropRecommendations > 0) {
    summary += `\n\n**Not Recommended (${decisionSummary.dropRecommendations} molecules):** `;
    summary += `${strategySummary.drop.slice(0, 2).join(' and ')} `;
    summary += `are not recommended due to extended patent protection or unfavorable market dynamics.`;
  }
  
  summary += `\n\n**Strategic Recommendation:** `;
  if (decisionSummary.genericOpportunities > 0) {
    summary += `Prioritize generic development for near-term revenue generation. `;
  }
  if (decisionSummary.licenseOpportunities > 0) {
    summary += `Pursue licensing discussions for high-value protected assets.`;
  }
  
  return summary;
}

/**
 * Generate fallback recommendations when AI is unavailable
 */
function generateFallbackRecommendations(
  strategySummary: { generic: string[]; license: string[]; wait: string[]; drop: string[] },
  topDecisions: MoleculeDecision[]
): string[] {
  const recommendations: string[] = [];
  
  // Generic recommendations
  if (strategySummary.generic.length > 0) {
    const topGeneric = strategySummary.generic[0];
    recommendations.push(`Initiate ANDA/generic filing for ${topGeneric} - immediate market entry opportunity`);
  }
  
  // License recommendations
  if (strategySummary.license.length > 0) {
    const topLicense = strategySummary.license[0];
    recommendations.push(`Explore licensing partnership for ${topLicense} with originator company`);
  }
  
  // Market-specific recommendation
  const indiaPriority = topDecisions.find(d => 
    d.recommendations?.some(r => r.country === 'IN' && r.goNoGo === 'GO')
  );
  if (indiaPriority) {
    recommendations.push(`Fast-track India market entry for ${indiaPriority.molecule} - favorable patent landscape`);
  }
  
  // Generic portfolio recommendation
  if (strategySummary.generic.length > 2) {
    recommendations.push(`Build generic portfolio with ${strategySummary.generic.slice(0, 3).join(', ')} for diversified revenue`);
  }
  
  // Fill remaining slots with generic advice
  while (recommendations.length < 4) {
    const genericRecs = [
      'Conduct detailed FTO analysis for top candidates before filing',
      'Engage regulatory consultants for market-specific approval pathways',
      'Monitor competitive landscape for biosimilar/generic entrants',
      'Evaluate manufacturing partnerships for cost-effective production',
    ];
    const unused = genericRecs.find(r => !recommendations.includes(r));
    if (unused) {
      recommendations.push(unused);
    } else {
      break;
    }
  }
  
  return recommendations.slice(0, 4);
}

export interface GenerateReportParams {
  jobId: string;
  queryText: string;
  decisions: MoleculeDecision[];
  decisionSummary: {
    totalMolecules: number;
    licenseOpportunities: number;
    genericOpportunities: number;
    waitOpportunities: number;
    dropRecommendations: number;
  };
  ftoResult: PatentFTOAgentResult;
  clinicalResult: ClinicalMaturityAgentResult;
  marketResult: EpidemiologyMarketAgentResult;
  filterCriteria: {
    indication?: string;
    country?: string;
  };
}

export async function generateReport(params: GenerateReportParams): Promise<string> {
  const { 
    jobId, 
    queryText, 
    decisions,
    decisionSummary,
    ftoResult,
    clinicalResult,
    marketResult,
    filterCriteria,
  } = params;

  await jobService.appendTraceEvent(jobId, {
    agent: 'ReportGenerator',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Generating board-ready report with commercial decisions',
  });

  try {
    // Get the set of indications from the selected molecules (respects query filtering)
    const selectedIndications = new Set<string>();
    for (const m of marketResult.molecules) {
      selectedIndications.add(m.indication);
    }

    // Calculate total addressable market ONLY for selected indications
    const totalAddressableMarketUSD = marketResult.molecules.reduce(
      (sum, m) => sum + m.totalAddressableMarketUSD, 0
    );

    // Group market by indication - only include indications from selected molecules
    const indicationMap = new Map<string, { marketSizeIN: number; marketSizeUS: number }>();
    for (const m of marketResult.molecules) {
      // Only include indications that are in our selected set
      if (!selectedIndications.has(m.indication)) continue;
      
      for (const data of m.marketData) {
        const existing = indicationMap.get(m.indication) || { marketSizeIN: 0, marketSizeUS: 0 };
        if (data.country === 'IN') {
          existing.marketSizeIN = data.marketSizeUSD;
        } else if (data.country === 'US') {
          existing.marketSizeUS = data.marketSizeUSD;
        }
        indicationMap.set(m.indication, existing);
      }
    }

    const marketOverview = {
      totalAddressableMarketUSD,
      byIndication: Array.from(indicationMap.entries()).map(([indication, sizes]) => ({
        indication,
        marketSizeIN: sizes.marketSizeIN,
        marketSizeUS: sizes.marketSizeUS,
      })),
      // Include what was filtered for transparency
      filteredIndication: filterCriteria.indication,
    };

    // Build strategy summary
    const strategySummary = {
      license: decisions.filter(d => d.overallStrategy === 'LICENSE').map(d => d.molecule),
      generic: decisions.filter(d => d.overallStrategy === 'GENERIC').map(d => d.molecule),
      wait: decisions.filter(d => d.overallStrategy === 'WAIT').map(d => d.molecule),
      drop: decisions.filter(d => d.overallStrategy === 'DROP').map(d => d.molecule),
    };

    // Build upcoming patent expiries
    const upcomingPatentExpiries: Array<{
      molecule: string;
      country: 'IN' | 'US';
      expiryDate: string;
      yearsToExpiry: number;
    }> = [];

    for (const mol of ftoResult.molecules) {
      for (const country of mol.byCountry) {
        if (country.ftoStatus === 'EXPIRING_SOON' || 
            (country.ftoStatus === 'BLOCKED' && country.yearsToGenericEntry <= 5)) {
          upcomingPatentExpiries.push({
            molecule: mol.molecule,
            country: country.country,
            expiryDate: country.earliestGenericEntry,
            yearsToExpiry: country.yearsToGenericEntry,
          });
        }
      }
    }

    // Sort by expiry date
    upcomingPatentExpiries.sort((a, b) => a.yearsToExpiry - b.yearsToExpiry);

    // Generate executive summary with Gemini
    const topDecisions = decisions.slice(0, 3);
    const summaryPrompt = `You are a pharmaceutical BD analyst. Write a concise executive summary (2-3 paragraphs) for a board presentation.

Query: "${queryText}"

Analysis Results:
- Total molecules analyzed: ${decisionSummary.totalMolecules}
- Total addressable market: $${(totalAddressableMarketUSD / 1_000_000_000).toFixed(1)}B

Commercial Recommendations:
${topDecisions.map(d => `- ${d.molecule} (${d.indication}): ${d.overallStrategy} - ${d.recommendations[0]?.rationale || 'See details'}`).join('\n')}

Strategy Breakdown:
- GENERIC opportunities: ${decisionSummary.genericOpportunities} molecules (immediate/near-term)
- LICENSE opportunities: ${decisionSummary.licenseOpportunities} molecules (requires deal)
- WAIT: ${decisionSummary.waitOpportunities} molecules (2-4 year horizon)
- DROP: ${decisionSummary.dropRecommendations} molecules (not recommended)

Write a professional summary highlighting key commercial opportunities and strategic implications for BD leadership.`;

    let summary = generateFallbackSummary(queryText, decisionSummary, totalAddressableMarketUSD, strategySummary, topDecisions, filterCriteria);
    
    let recommendations: string[] = generateFallbackRecommendations(strategySummary, topDecisions);

    try {
      const summaryResponse = await callGemini(summaryPrompt);
      if (summaryResponse && summaryResponse.trim().length > 100) {
        summary = summaryResponse.trim();
      }
      // If AI response is too short, keep the detailed fallback

      // Generate actionable recommendations
      const recsPrompt = `Based on this pharmaceutical BD analysis, provide exactly 4 board-level action items as a JSON array:

Top opportunity: ${topDecisions[0]?.molecule || 'N/A'} (${topDecisions[0]?.overallStrategy || 'N/A'})
Generic opportunities: ${strategySummary.generic.join(', ') || 'None'}
License opportunities: ${strategySummary.license.join(', ') || 'None'}

Return only a JSON array of action items. Example:
["Initiate ANDA filing for Tiotropium in India by Q2", "Begin license negotiations with Novo Nordisk for Semaglutide", ...]`;

      const recsResponse = await callGemini(recsPrompt);
      const recsJson = recsResponse.match(/\[[\s\S]*\]/);
      if (recsJson) {
        const parsed = JSON.parse(recsJson[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recommendations = parsed.slice(0, 4);
        }
      }
    } catch (geminiError) {
      console.error('Gemini summary generation failed, using defaults');
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'ReportGenerator',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: 'Creating PDF report',
    });

    // Create report payload with decision-driven structure
    const reportPayload: ReportPayload = {
      queryText,
      summary,
      decisions,
      marketOverview,
      strategySummary,
      recommendations,
      upcomingPatentExpiries,
      // Legacy compatibility - store a calculated confidence
      confidence: calculateOverallConfidence(decisions),
    };

    // Create report in database
    const report = await prisma.report.create({
      data: {
        jobId,
        summary,
        confidence: reportPayload.confidence || 0.75,
        data: JSON.stringify(reportPayload),
      },
    });

    // Generate PDF
    const pdfPath = await pdfService.generatePdf(report.id, reportPayload);

    // Update report with PDF path
    await prisma.report.update({
      where: { id: report.id },
      data: { pdfPath },
    });

    // Update job with result
    await prisma.job.update({
      where: { id: jobId },
      data: { resultId: report.id },
    });

    await jobService.appendTraceEvent(jobId, {
      agent: 'ReportGenerator',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Report ${report.id} generated: ${strategySummary.generic.length} GENERIC, ${strategySummary.license.length} LICENSE`,
    });

    return report.id;
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'ReportGenerator',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Calculate an overall confidence score based on decisions
 * This is kept for backward compatibility with legacy UI
 */
function calculateOverallConfidence(decisions: MoleculeDecision[]): number {
  if (decisions.length === 0) return 0.5;

  // Score based on actionable opportunities
  const genericCount = decisions.filter(d => d.overallStrategy === 'GENERIC').length;
  const licenseCount = decisions.filter(d => d.overallStrategy === 'LICENSE').length;
  const waitCount = decisions.filter(d => d.overallStrategy === 'WAIT').length;

  // More actionable opportunities = higher confidence
  const actionableRatio = (genericCount + licenseCount + waitCount * 0.5) / decisions.length;
  
  // Risk-adjusted score
  const lowRiskCount = decisions.filter(d => d.overallRisk === 'LOW').length;
  const riskRatio = lowRiskCount / decisions.length;

  return Math.round((0.5 + actionableRatio * 0.3 + riskRatio * 0.2) * 100) / 100;
}
