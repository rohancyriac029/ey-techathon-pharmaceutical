import { jobService } from '../services/jobService';
import { cacheService } from '../services/cacheService';
import { callGemini, extractJson } from '../services/geminiClient';
import { runClinicalTrialsAgent } from './clinicalTrialsAgent';
import { runPatentAgent } from './patentAgent';
import { runSynthesisEngine } from './synthesisEngine';
import { generateReport } from './reportGenerator';
import { ExecutionPlan, ExecutionPlanSchema } from '../types/query';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function runMasterAgent(queryText: string, jobId: string): Promise<void> {
  try {
    // Update job status to running
    await jobService.updateJob(jobId, { status: 'running' });

    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: 'Starting analysis pipeline',
    });

    // Check cache first
    const cacheKey = cacheService.createKey(queryText);
    const cachedResult = cacheService.get(cacheKey);

    if (cachedResult) {
      await jobService.appendTraceEvent(jobId, {
        agent: 'Cache',
        status: 'completed',
        timestamp: new Date().toISOString(),
        detail: 'Cache hit - returning cached result',
      });

      // Link to cached report
      await jobService.updateJob(jobId, {
        status: 'completed',
        resultId: cachedResult.reportId,
        cacheKey,
      });

      await jobService.appendTraceEvent(jobId, {
        agent: 'MasterAgent',
        status: 'completed',
        timestamp: new Date().toISOString(),
        detail: 'Analysis complete (from cache)',
      });

      return;
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'Cache',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: 'Cache miss - running full analysis',
    });

    // Parse query with Gemini to create execution plan
    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: 'Parsing query with AI',
    });

    const planPrompt = `You are a pharmaceutical research query parser. Parse this natural language query and extract structured parameters.

Query: "${queryText}"

Extract and return a JSON object with these fields:
- condition: the disease or medical condition mentioned (e.g., "COPD", "respiratory disease", "cancer")
- country: the target country/region mentioned (e.g., "India", "USA")
- molecule: specific molecule name if mentioned
- objectives: array of goals mentioned (e.g., ["low competition", "high patient burden"])
- agentsToRun: always ["clinical", "patent"]

Return only valid JSON, no other text. Example:
{
  "condition": "respiratory disease",
  "country": "India",
  "objectives": ["low competition", "high patient burden"],
  "agentsToRun": ["clinical", "patent"]
}`;

    let plan: ExecutionPlan = {
      agentsToRun: ['clinical', 'patent'],
    };

    try {
      const planResponse = await callGemini(planPrompt);
      const jsonStr = extractJson(planResponse);
      const parsed = JSON.parse(jsonStr);
      
      const validated = ExecutionPlanSchema.safeParse(parsed);
      if (validated.success) {
        plan = validated.data;
      }
    } catch (parseError) {
      console.error('Failed to parse execution plan, using defaults');
      // Extract basic info from query text manually
      if (queryText.toLowerCase().includes('india')) plan.country = 'India';
      if (queryText.toLowerCase().includes('usa') || queryText.toLowerCase().includes('united states')) plan.country = 'USA';
      if (queryText.toLowerCase().includes('respiratory') || queryText.toLowerCase().includes('copd') || queryText.toLowerCase().includes('asthma')) {
        plan.condition = 'respiratory';
      }
      if (queryText.toLowerCase().includes('cancer') || queryText.toLowerCase().includes('oncology')) {
        plan.condition = 'cancer';
      }
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: `Execution plan: condition=${plan.condition || 'any'}, country=${plan.country || 'any'}`,
    });

    // Run agents in parallel
    const [clinicalResult, patentResult] = await Promise.all([
      runClinicalTrialsAgent(plan, jobId),
      runPatentAgent(plan, jobId),
    ]);

    // Run synthesis engine
    const synthesisResult = await runSynthesisEngine(
      clinicalResult,
      patentResult,
      queryText,
      jobId
    );

    // Generate report with enhanced data
    const reportId = await generateReport({
      jobId,
      queryText,
      opportunities: synthesisResult.opportunities,
      clinicalResult,
      patentResult,
      confidence: synthesisResult.overallConfidence,
      // Enhanced fields
      confidenceDecomposition: synthesisResult.confidenceDecomposition,
      marketInsights: synthesisResult.marketInsights,
      patentCliff: patentResult.patentCliff,
    });

    // Cache the result
    cacheService.set(cacheKey, { reportId });

    // Update job as completed
    await jobService.updateJob(jobId, {
      status: 'completed',
      cacheKey,
    });

    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: 'Analysis pipeline complete',
    });

  } catch (error) {
    console.error('Master agent error:', error);
    
    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });

    await jobService.updateJob(jobId, { status: 'error' });
  }
}
