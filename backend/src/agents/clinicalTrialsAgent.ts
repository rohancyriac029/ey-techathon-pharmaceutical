import { clinicalDataService } from '../services/clinicalDataService';
import { jobService } from '../services/jobService';
import { callGemini, extractJson } from '../services/geminiClient';
import { ClinicalAgentResult, MoleculeTrialData, AgentTraceEvent } from '../types/agent';
import { ExecutionPlan } from '../types/query';

export async function runClinicalTrialsAgent(
  plan: ExecutionPlan,
  jobId: string
): Promise<ClinicalAgentResult> {
  // Log start
  await jobService.appendTraceEvent(jobId, {
    agent: 'ClinicalTrialsAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Querying clinical trials database',
  });

  try {
    // Build filters from plan
    const filters: any = {};
    if (plan.condition) filters.condition = plan.condition;
    if (plan.country) filters.country = plan.country;
    if (plan.molecule) filters.molecule = plan.molecule;

    // Query database
    const trials = await clinicalDataService.findTrials(filters);

    // If no specific filters, get all trials
    const allTrials = trials.length > 0 ? trials : await clinicalDataService.getAllTrials();

    // Group by molecule
    const moleculeMap = new Map<string, MoleculeTrialData>();

    for (const trial of allTrials) {
      const existing = moleculeMap.get(trial.molecule);
      if (existing) {
        existing.trialCount++;
        existing.phases[trial.phase] = (existing.phases[trial.phase] || 0) + 1;
        if (!existing.sponsors.includes(trial.sponsor)) {
          existing.sponsors.push(trial.sponsor);
        }
        if (!existing.citations.includes(trial.citations)) {
          existing.citations.push(trial.citations);
        }
        if (!existing.countries.includes(trial.country)) {
          existing.countries.push(trial.country);
        }
      } else {
        moleculeMap.set(trial.molecule, {
          molecule: trial.molecule,
          trialCount: 1,
          phases: { [trial.phase]: 1 },
          sponsors: [trial.sponsor],
          citations: [trial.citations],
          countries: [trial.country],
        });
      }
    }

    const byMolecule = Array.from(moleculeMap.values());

    // Optionally use Gemini to add insights
    if (byMolecule.length > 0) {
      await jobService.appendTraceEvent(jobId, {
        agent: 'ClinicalTrialsAgent',
        status: 'running',
        timestamp: new Date().toISOString(),
        detail: `Found ${byMolecule.length} molecules, analyzing patterns`,
      });
    }

    // Log completion
    await jobService.appendTraceEvent(jobId, {
      agent: 'ClinicalTrialsAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Processed ${allTrials.length} trials across ${byMolecule.length} molecules`,
    });

    return { byMolecule };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'ClinicalTrialsAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
