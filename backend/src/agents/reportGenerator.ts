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

    let summary = `Analysis complete for ${decisionSummary.totalMolecules} molecules across India and US markets. ` +
      `Identified ${decisionSummary.genericOpportunities} generic opportunities and ${decisionSummary.licenseOpportunities} licensing candidates.`;
    
    let recommendations: string[] = [
      'Prioritize generic filings for molecules with expired patents in target markets',
      'Evaluate licensing opportunities for high-value molecules with patent protection',
      'Monitor patent expiry timelines for WAIT-listed molecules',
    ];

    try {
      const summaryResponse = await callGemini(summaryPrompt);
      summary = summaryResponse.trim();

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
