import { PrismaClient } from '@prisma/client';
import { jobService } from '../services/jobService';
import {
  ClinicalMaturityAgentResult,
  ClinicalMaturityAssessment,
  ClinicalTrialInfo,
} from '../types/agent';

const prisma = new PrismaClient();

/**
 * Clinical Maturity Agent - Regulatory Readiness Assessment
 * 
 * Key Business Logic:
 * - Higher phases = more mature = lower regulatory risk
 * - Local trial data (IN or US) reduces regulatory risk in that country
 * - Approved status = ready for commercialization
 * - Risk flags highlight potential issues (terminated trials, no local data)
 */
export async function runClinicalMaturityAgent(
  moleculeNames: string[],
  jobId: string
): Promise<ClinicalMaturityAgentResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'ClinicalMaturityAgent',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: `Assessing clinical maturity for ${moleculeNames.length} molecules`,
  });

  try {
    const molecules: ClinicalMaturityAssessment[] = [];

    for (const moleculeName of moleculeNames) {
      // Fetch molecule info
      const molecule = await prisma.molecule.findUnique({
        where: { name: moleculeName },
      });

      // Fetch clinical trials
      const trials = await prisma.clinicalTrial.findMany({
        where: { molecule: moleculeName },
        orderBy: { phase: 'desc' },
      });

      // Fetch regulatory status
      const regulatoryRecords = await prisma.regulatoryStatus.findMany({
        where: { molecule: moleculeName },
      });

      // Build regulatory status map
      const regulatoryStatus: Record<'IN' | 'US', string> = {
        IN: 'Not Filed',
        US: 'Not Filed',
      };
      for (const reg of regulatoryRecords) {
        if (reg.country === 'IN' || reg.country === 'US') {
          regulatoryStatus[reg.country] = reg.status;
        }
      }

      // Determine highest phase completed
      const phaseOrder = ['Phase IV', 'Phase III', 'Phase II', 'Phase I'];
      let highestPhaseCompleted = 'None';
      let hasPhase3Data = false;

      for (const phase of phaseOrder) {
        const completedTrial = trials.find(
          t => t.phase === phase && t.status === 'Completed'
        );
        if (completedTrial) {
          highestPhaseCompleted = phase;
          break;
        }
      }

      // Check for Phase III data
      hasPhase3Data = trials.some(
        t => (t.phase === 'Phase III' || t.phase === 'Phase IV') && 
             (t.status === 'Completed' || t.outcome === 'Positive')
      );

      // Check for local trial data
      const hasLocalTrialData: Record<'IN' | 'US', boolean> = {
        IN: trials.some(t => t.country === 'IN'),
        US: trials.some(t => t.country === 'US'),
      };

      // Identify clinical risk flags
      const clinicalRiskFlags: string[] = [];

      // Check for terminated trials
      const terminatedTrials = trials.filter(t => t.status === 'Terminated');
      if (terminatedTrials.length > 0) {
        clinicalRiskFlags.push(`${terminatedTrials.length} terminated trial(s)`);
      }

      // Check for negative outcomes
      const negativeOutcomes = trials.filter(t => t.outcome === 'Negative');
      if (negativeOutcomes.length > 0) {
        clinicalRiskFlags.push(`${negativeOutcomes.length} trial(s) with negative outcome`);
      }

      // Check for missing local data
      if (!hasLocalTrialData.IN && regulatoryStatus.IN !== 'Approved') {
        clinicalRiskFlags.push('No clinical trial data in India');
      }
      if (!hasLocalTrialData.US && regulatoryStatus.US !== 'Approved') {
        clinicalRiskFlags.push('No clinical trial data in US');
      }

      // Check for regulatory gaps
      if (regulatoryStatus.IN === 'Not Filed') {
        clinicalRiskFlags.push('Not yet filed for approval in India');
      }
      if (regulatoryStatus.US === 'Not Filed') {
        clinicalRiskFlags.push('Not yet filed for approval in US');
      }

      // No Phase III data is a significant risk
      if (!hasPhase3Data) {
        clinicalRiskFlags.push('No Phase III efficacy data available');
      }

      // Calculate maturity score (0-100)
      let maturityScore = 0;

      // Phase contribution (up to 40 points)
      const phaseScores: Record<string, number> = {
        'Phase IV': 40,
        'Phase III': 35,
        'Phase II': 20,
        'Phase I': 10,
        'None': 0,
      };
      maturityScore += phaseScores[highestPhaseCompleted] || 0;

      // Regulatory approval contribution (up to 30 points)
      if (regulatoryStatus.US === 'Approved') maturityScore += 15;
      if (regulatoryStatus.IN === 'Approved') maturityScore += 15;

      // Local trial data contribution (up to 20 points)
      if (hasLocalTrialData.US) maturityScore += 10;
      if (hasLocalTrialData.IN) maturityScore += 10;

      // Positive outcomes bonus (up to 10 points)
      const positiveOutcomes = trials.filter(t => t.outcome === 'Positive').length;
      maturityScore += Math.min(10, positiveOutcomes * 3);

      // Risk flag penalty
      maturityScore -= clinicalRiskFlags.length * 5;
      maturityScore = Math.max(0, Math.min(100, maturityScore));

      // Build trial info array
      const trialInfos: ClinicalTrialInfo[] = trials.map(t => ({
        trialId: t.trialId || undefined,
        phase: t.phase,
        status: t.status,
        country: t.country,
        sponsor: t.sponsor,
        outcome: t.outcome || undefined,
        completionDate: t.completionDate?.toISOString().split('T')[0],
      }));

      molecules.push({
        molecule: moleculeName,
        indication: molecule?.indication || 'Unknown',
        highestPhaseCompleted,
        hasPhase3Data,
        hasLocalTrialData,
        regulatoryStatus,
        clinicalRiskFlags,
        maturityScore,
        trials: trialInfos,
      });
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'ClinicalMaturityAgent',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Assessed ${molecules.length} molecules. Avg maturity: ${
        Math.round(molecules.reduce((sum, m) => sum + m.maturityScore, 0) / molecules.length)
      }`,
    });

    return { molecules };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'ClinicalMaturityAgent',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
