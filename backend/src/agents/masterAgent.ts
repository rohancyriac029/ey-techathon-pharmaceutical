import { jobService } from '../services/jobService';
import { cacheService } from '../services/cacheService';
import { callGemini, extractJson } from '../services/geminiClient';
import { runMoleculeScopeAgent } from './moleculeScopeAgent';
import { runPatentFTOAgent } from './patentFTOAgent';
import { runClinicalMaturityAgent } from './clinicalMaturityAgent';
import { runEpidemiologyMarketAgent } from './epidemiologyMarketAgent';
import { runCommercialDecisionAgent } from './commercialDecisionAgent';
import { generateReport } from './reportGenerator';
import { ExecutionPlan, ExecutionPlanSchema } from '../types/query';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Master Agent - Orchestrates the Decision-Driven Analysis Pipeline
 * 
 * Pipeline:
 * 1. Parse query → ExecutionPlan
 * 2. MoleculeScopeAgent → Select relevant molecules
 * 3. Run in parallel:
 *    - PatentFTOAgent → Country-specific FTO analysis
 *    - ClinicalMaturityAgent → Regulatory readiness
 *    - EpidemiologyMarketAgent → Market opportunity
 * 4. CommercialDecisionAgent → LICENSE | GENERIC | WAIT | DROP
 * 5. ReportGenerator → Board-ready output
 */
export async function runMasterAgent(queryText: string, jobId: string): Promise<void> {
  try {
    // Update job status to running
    await jobService.updateJob(jobId, { status: 'running' });

    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: 'Starting decision-driven analysis pipeline',
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

    // ============================================
    // STEP 1: Parse Query with AI
    // ============================================
    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: 'Parsing query with AI',
    });

    const planPrompt = `You are a pharmaceutical BD query parser. Parse this query and extract structured parameters.

Query: "${queryText}"

Extract and return a JSON object with:
- condition: disease/indication (e.g., "COPD", "Type 2 Diabetes", "NSCLC", "respiratory", "diabetes", "cancer")
- country: target market (e.g., "India", "USA", "IN", "US")
- molecule: specific molecule if mentioned (e.g., "Semaglutide", "Tiotropium")
- objectives: business goals (e.g., ["generic opportunity", "licensing deal", "patent expiry"])
- agentsToRun: always ["scope", "fto", "clinical", "market", "decision"]

Return only valid JSON. Example:
{
  "condition": "COPD",
  "country": "India",
  "objectives": ["generic opportunity", "low competition"],
  "agentsToRun": ["scope", "fto", "clinical", "market", "decision"]
}`;

    let plan: ExecutionPlan = {
      agentsToRun: ['scope', 'fto', 'clinical', 'market', 'decision'],
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
      console.error('Failed to parse execution plan, using manual extraction');
    }

    // ALWAYS run manual extraction to verify/supplement AI parsing
    // This ensures we catch conditions even if AI returns slightly different wording
    const lowerQuery = queryText.toLowerCase();
    
    // Country detection
    if (!plan.country) {
      if (lowerQuery.includes('india') || lowerQuery.match(/\bin\b/)) plan.country = 'India';
      if (lowerQuery.includes('usa') || lowerQuery.includes('united states') || lowerQuery.match(/\bus\b/)) plan.country = 'USA';
    }
    
    // Condition detection - ALWAYS check and override if we find a clear match
    // NSCLC / Oncology - check FIRST since it's commonly misspelled
    if (lowerQuery.includes('nsclc') || lowerQuery.includes('nslc') || 
        lowerQuery.includes('lung cancer') || lowerQuery.includes('non-small cell') ||
        (lowerQuery.includes('oncology') && !lowerQuery.includes('immuno'))) {
      plan.condition = 'NSCLC';
      console.log('🎯 Detected NSCLC condition from query');
    }
    // COPD / Respiratory
    else if (lowerQuery.includes('respiratory') || lowerQuery.includes('copd') || 
        lowerQuery.includes('lung disease') || lowerQuery.includes('pulmonary') ||
        lowerQuery.includes('chronic obstructive')) {
      plan.condition = 'COPD';
    }
    // Type 2 Diabetes
    else if (lowerQuery.includes('diabetes') || lowerQuery.includes('t2d') ||
             lowerQuery.includes('diabetic') || lowerQuery.includes('type 2')) {
      plan.condition = 'Type 2 Diabetes';
    }
    // Rheumatoid Arthritis
    else if (lowerQuery.includes('arthritis') || lowerQuery.includes('rheumatoid') ||
             lowerQuery.includes('autoimmune') || lowerQuery.match(/\bra\b/)) {
      plan.condition = 'Rheumatoid Arthritis';
    }
    // Cardiovascular
    else if (lowerQuery.includes('cardiovascular') || lowerQuery.includes('heart') ||
             lowerQuery.includes('cholesterol') || lowerQuery.includes('statin') ||
             lowerQuery.includes('lipid') || lowerQuery.match(/\bcv\b/)) {
      plan.condition = 'Cardiovascular';
    }
    // Hypertension
    else if (lowerQuery.includes('hypertension') || lowerQuery.includes('blood pressure') ||
             lowerQuery.includes('high bp') || lowerQuery.match(/\bhtn\b/)) {
      plan.condition = 'Hypertension';
    }
    // Generic cancer/tumor queries -> NSCLC
    else if (lowerQuery.includes('cancer') || lowerQuery.includes('tumor')) {
      plan.condition = 'NSCLC';
    }
    
    // Check for specific molecules
    if (!plan.molecule) {
      const molecules = ['semaglutide', 'sitagliptin', 'empagliflozin', 'tiotropium', 
                        'roflumilast', 'osimertinib', 'pembrolizumab', 'umeclidinium',
                        'indacaterol', 'metformin', 'erlotinib', 'gefitinib',
                        'adalimumab', 'etanercept', 'tofacitinib', 'baricitinib',
                        'atorvastatin', 'rosuvastatin', 'ezetimibe', 'clopidogrel',
                        'lisinopril', 'amlodipine', 'losartan', 'valsartan'];
      for (const mol of molecules) {
        if (lowerQuery.includes(mol)) {
          plan.molecule = mol.charAt(0).toUpperCase() + mol.slice(1);
          break;
        }
      }
    }
    
    // Log what was detected for debugging
    console.log(`📋 Query parsed: condition=${plan.condition || 'ALL'}, country=${plan.country || 'IN+US'}, molecule=${plan.molecule || 'all'}`);

    await jobService.appendTraceEvent(jobId, {
      agent: 'MasterAgent',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: `Plan: ${plan.condition || 'all indications'}, ${plan.country || 'IN+US'}, molecule=${plan.molecule || 'all'}`,
    });

    // ============================================
    // STEP 2: Select Molecules
    // ============================================
    const scopeResult = await runMoleculeScopeAgent(plan, jobId);

    if (scopeResult.selectedMolecules.length === 0) {
      throw new Error('No molecules found matching query criteria');
    }

    // ============================================
    // STEP 3: Run Analysis Agents in Parallel
    // ============================================
    const [ftoResult, clinicalResult, marketResult] = await Promise.all([
      runPatentFTOAgent(scopeResult.selectedMolecules, jobId),
      runClinicalMaturityAgent(scopeResult.selectedMolecules, jobId),
      runEpidemiologyMarketAgent(scopeResult.selectedMolecules, jobId),
    ]);

    // ============================================
    // STEP 4: Commercial Decision Making
    // ============================================
    const decisionResult = await runCommercialDecisionAgent(
      ftoResult.molecules,
      clinicalResult.molecules,
      marketResult.molecules,
      jobId
    );

    // ============================================
    // STEP 5: Generate Board-Ready Report
    // ============================================
    const reportId = await generateReport({
      jobId,
      queryText,
      decisions: decisionResult.decisions,
      decisionSummary: decisionResult.summary,
      ftoResult,
      clinicalResult,
      marketResult,
      filterCriteria: scopeResult.filterCriteria,
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
      detail: `Analysis complete: ${decisionResult.summary.genericOpportunities} GENERIC, ` +
        `${decisionResult.summary.licenseOpportunities} LICENSE, ` +
        `${decisionResult.summary.waitOpportunities} WAIT, ` +
        `${decisionResult.summary.dropRecommendations} DROP`,
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
