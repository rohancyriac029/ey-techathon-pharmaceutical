import { PrismaClient } from '@prisma/client';
import { callGemini } from '../services/geminiClient';
import { pdfService } from '../services/pdfService';
import { jobService } from '../services/jobService';
import { 
  ClinicalAgentResult, 
  PatentAgentResult, 
  Opportunity,
  ConfidenceDecomposition,
  MarketInsights,
  PatentCliffData
} from '../types/agent';
import { ReportPayload } from '../types/report';

const prisma = new PrismaClient();

export interface GenerateReportParams {
  jobId: string;
  queryText: string;
  opportunities: Opportunity[];
  clinicalResult: ClinicalAgentResult;
  patentResult: PatentAgentResult;
  confidence: number;
  // Enhanced fields
  confidenceDecomposition?: ConfidenceDecomposition;
  marketInsights?: MarketInsights;
  patentCliff?: PatentCliffData;
}

export async function generateReport(params: GenerateReportParams): Promise<string> {
  const { 
    jobId, 
    queryText, 
    opportunities, 
    clinicalResult, 
    patentResult, 
    confidence,
    confidenceDecomposition,
    marketInsights,
    patentCliff
  } = params;

  await jobService.appendTraceEvent(jobId, {
    agent: 'ReportGenerator',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Generating executive summary with enhanced analytics',
  });

  try {
    // Build enhanced summary context
    const licensingInfo = marketInsights 
      ? `Strong licensing candidates: ${marketInsights.strongLicensingCandidates}` 
      : '';
    const cliffInfo = patentCliff 
      ? `Patent cliff: ${patentCliff.expiring1Year.length} expiring in 1yr, ${patentCliff.expiring3Years.length} in 3yrs`
      : '';

    // Generate executive summary with Gemini
    const summaryPrompt = `You are a pharmaceutical analyst. Write a concise executive summary (2-3 paragraphs) for this analysis:

Query: "${queryText}"

Top Opportunities:
${opportunities.slice(0, 3).map(o => `- ${o.molecule}: ${o.rationale}`).join('\n')}

Key Statistics:
- Molecules analyzed: ${new Set([...clinicalResult.byMolecule.map(m => m.molecule), ...patentResult.byMolecule.map(m => m.molecule)]).size}
- Clinical trials found: ${clinicalResult.byMolecule.reduce((sum, m) => sum + m.trialCount, 0)}
- Patents analyzed: ${patentResult.byMolecule.reduce((sum, m) => sum + m.citations.length, 0)}
- Overall confidence: ${(confidence * 100).toFixed(0)}%
${licensingInfo}
${cliffInfo}

Write a professional summary highlighting key findings and strategic implications.`;

    let summary = 'Analysis complete. Please review the opportunities and FTO risks below.';
    let recommendations: string[] = [
      'Review top-ranked molecules for further due diligence',
      'Conduct detailed FTO analysis for selected candidates',
      'Engage regulatory experts for market entry strategy',
    ];
    let suggestedQueries: string[] = [];

    try {
      const summaryResponse = await callGemini(summaryPrompt);
      summary = summaryResponse.trim();

      // Generate recommendations
      const recsPrompt = `Based on this pharmaceutical analysis, provide exactly 3 actionable next steps as a JSON array of strings:

Query: "${queryText}"
Top opportunity: ${opportunities[0]?.molecule || 'N/A'}
Confidence: ${(confidence * 100).toFixed(0)}%

Return only a JSON array like: ["Step 1...", "Step 2...", "Step 3..."]`;

      const recsResponse = await callGemini(recsPrompt);
      const recsJson = recsResponse.match(/\[[\s\S]*\]/);
      if (recsJson) {
        const parsed = JSON.parse(recsJson[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recommendations = parsed.slice(0, 3);
        }
      }

      // Generate suggested follow-up queries
      const suggestPrompt = `Based on this pharmaceutical analysis query: "${queryText}"

Suggest 3 follow-up queries the user might want to ask. Return as a JSON array of strings.
Example: ["Compare molecule X vs Y for India", "Show patent cliff for respiratory drugs", "Find Phase III trials in oncology"]`;

      try {
        const suggestResponse = await callGemini(suggestPrompt);
        const suggestJson = suggestResponse.match(/\[[\s\S]*\]/);
        if (suggestJson) {
          const parsedSuggestions = JSON.parse(suggestJson[0]);
          if (Array.isArray(parsedSuggestions)) {
            suggestedQueries = parsedSuggestions.slice(0, 3);
          }
        }
      } catch (suggestError) {
        // Fallback suggested queries
        suggestedQueries = [
          `Compare top molecules: ${opportunities.slice(0, 2).map(o => o.molecule).join(' vs ')}`,
          'Show molecules with patent expiry in next 3 years',
          'Find strong licensing candidates with LOW FTO risk',
        ];
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

    // Create report payload with enhanced fields
    const reportPayload: ReportPayload = {
      queryText,
      summary,
      opportunities,
      trialsSummary: clinicalResult,
      patentSummary: patentResult,
      confidence,
      recommendations,
      // Enhanced fields
      confidenceDecomposition,
      marketInsights,
      patentCliff,
      suggestedQueries,
    };

    // Create report in database
    const report = await prisma.report.create({
      data: {
        jobId,
        summary,
        confidence,
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
      detail: `Report ${report.id} generated successfully`,
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
