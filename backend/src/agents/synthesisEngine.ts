import { callGemini, extractJson } from '../services/geminiClient';
import { jobService } from '../services/jobService';
import { 
  ClinicalAgentResult, 
  PatentAgentResult, 
  Opportunity, 
  SynthesisResult,
  ScoreBreakdown,
  CompetitiveAnalysis,
  CompetitiveIntensity,
  LicensingAnalysis,
  LicensingSignal,
  GeoReadiness,
  ConfidenceDecomposition,
  MarketInsights
} from '../types/agent';

interface MoleculeFeatures {
  molecule: string;
  clinicalIntensity: number;
  competitionScore: number;
  ftoFlag: string;
  trialCount: number;
  patentCount: number;
  phases: Record<string, number>;
  sponsors: string[];
  jurisdictions: string[];
  countries: string[];
  yearsToExpiry: number;
}

// ============================================
// Competitive Intensity Calculator
// ============================================
function calculateCompetitiveAnalysis(features: MoleculeFeatures): CompetitiveAnalysis {
  const sponsorCount = features.sponsors.length;
  const trialCount = features.trialCount;
  const jurisdictionCount = features.jurisdictions.length;
  
  // Normalized index (0-100)
  const indexScore = Math.min(100, Math.round(
    (sponsorCount * 15) + (trialCount * 10) + (jurisdictionCount * 5)
  ));
  
  let intensity: CompetitiveIntensity;
  if (indexScore < 30) {
    intensity = 'UNDERCROWDED';
  } else if (indexScore < 60) {
    intensity = 'COMPETITIVE';
  } else {
    intensity = 'SATURATED';
  }
  
  return {
    intensity,
    sponsorCount,
    trialCount,
    jurisdictionCount,
    indexScore,
  };
}

// ============================================
// Licensing Signal Detector
// ============================================
function calculateLicensingSignal(features: MoleculeFeatures): LicensingAnalysis {
  const phase2Trials = features.phases['Phase II'] || 0;
  const phase3Trials = features.phases['Phase III'] || 0;
  const phase1Trials = features.phases['Phase I'] || 0;
  const sponsorDiversity = features.sponsors.length;
  const ftoFlag = features.ftoFlag;
  
  const reasons: string[] = [];
  let signalScore = 0;
  
  // Multiple Phase II trials = strong licensing signal
  if (phase2Trials >= 2) {
    signalScore += 3;
    reasons.push(`${phase2Trials} Phase II trials showing active development`);
  } else if (phase2Trials === 1) {
    signalScore += 1;
    reasons.push('Phase II trial in progress');
  }
  
  // Few Phase III trials = not locked in
  if (phase3Trials === 0) {
    signalScore += 2;
    reasons.push('No Phase III lock-in yet');
  } else if (phase3Trials === 1) {
    signalScore += 1;
    reasons.push('Limited Phase III activity');
  }
  
  // Sponsor diversity = potential interest
  if (sponsorDiversity >= 3) {
    signalScore += 2;
    reasons.push(`${sponsorDiversity} different sponsors showing market interest`);
  } else if (sponsorDiversity >= 2) {
    signalScore += 1;
    reasons.push('Multiple sponsors exploring');
  }
  
  // FTO considerations
  if (ftoFlag === 'LOW') {
    signalScore += 2;
    reasons.push('LOW FTO risk - clear patent landscape');
  } else if (ftoFlag === 'MEDIUM') {
    signalScore += 1;
    reasons.push('MEDIUM FTO risk - patent expiring soon');
  }
  
  // Early stage activity
  if (phase1Trials >= 2 && phase2Trials >= 1) {
    signalScore += 1;
    reasons.push('Active pipeline progression');
  }
  
  let signal: LicensingSignal;
  if (signalScore >= 7) {
    signal = 'STRONG';
  } else if (signalScore >= 4) {
    signal = 'MODERATE';
  } else if (signalScore >= 2) {
    signal = 'WEAK';
  } else {
    signal = 'NONE';
  }
  
  return {
    signal,
    reasons,
    phase2Trials,
    phase3Trials,
    sponsorDiversity,
  };
}

// ============================================
// Geographic Readiness Calculator
// ============================================
function calculateGeoReadiness(
  features: MoleculeFeatures, 
  targetCountries: string[] = ['India', 'USA', 'China', 'Germany', 'Japan', 'UK']
): GeoReadiness[] {
  const jurisdictionMap: Record<string, string> = {
    'India': 'IN',
    'USA': 'US',
    'China': 'CN',
    'Germany': 'DE',
    'Japan': 'JP',
    'UK': 'GB',
    'Europe': 'EP',
  };
  
  return targetCountries.map(country => {
    const jurisdiction = jurisdictionMap[country];
    const hasTrials = features.countries.includes(country);
    const hasFavorablePatent = features.ftoFlag === 'LOW' || 
      (features.ftoFlag === 'MEDIUM' && !features.jurisdictions.includes(jurisdiction));
    const sponsorPresence = features.sponsors.some(s => 
      // Simple heuristic: Indian companies for India, etc.
      (country === 'India' && ['Sun Pharma', 'Cipla', 'Dr. Reddys', 'Bharat Biotech'].some(c => s.includes(c))) ||
      (country === 'USA' && ['Pfizer', 'Moderna', 'Merck'].some(c => s.includes(c))) ||
      (country === 'Germany' && ['Bayer', 'Boehringer'].some(c => s.includes(c)))
    );
    
    let readinessScore = 0;
    if (hasTrials) readinessScore += 0.4;
    if (hasFavorablePatent) readinessScore += 0.35;
    if (sponsorPresence) readinessScore += 0.25;
    
    return {
      country,
      readinessScore: Math.round(readinessScore * 100) / 100,
      hasTrials,
      hasFavorablePatent,
      sponsorPresence,
    };
  });
}

// ============================================
// Score Breakdown Calculator
// ============================================
function calculateScoreBreakdown(
  features: MoleculeFeatures,
  licensingSignal: LicensingSignal
): ScoreBreakdown {
  const baseScore = 0.40;
  
  // Trial score: more trials = more validated
  const trialScore = Math.min(0.20, features.trialCount * 0.04);
  
  // FTO adjustment
  let ftoAdjustment = 0;
  if (features.ftoFlag === 'LOW') ftoAdjustment = 0.15;
  else if (features.ftoFlag === 'MEDIUM') ftoAdjustment = 0.05;
  else ftoAdjustment = -0.10;
  
  // Phase bonus
  let phaseBonus = 0;
  if (features.phases['Phase III']) phaseBonus += 0.10;
  if (features.phases['Phase II']) phaseBonus += 0.05;
  
  // Competition penalty
  const competitionPenalty = Math.min(0.15, features.sponsors.length * 0.02);
  
  // Licensing bonus
  let licensingBonus = 0;
  if (licensingSignal === 'STRONG') licensingBonus = 0.10;
  else if (licensingSignal === 'MODERATE') licensingBonus = 0.05;
  
  const total = Math.max(0.30, Math.min(0.95,
    baseScore + trialScore + ftoAdjustment + phaseBonus - competitionPenalty + licensingBonus
  ));
  
  return {
    baseScore,
    trialScore: Math.round(trialScore * 100) / 100,
    ftoAdjustment: Math.round(ftoAdjustment * 100) / 100,
    phaseBonus: Math.round(phaseBonus * 100) / 100,
    competitionPenalty: Math.round(competitionPenalty * 100) / 100,
    licensingBonus: Math.round(licensingBonus * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ============================================
// Main Synthesis Engine
// ============================================
export async function runSynthesisEngine(
  clinicalResult: ClinicalAgentResult,
  patentResult: PatentAgentResult,
  queryText: string,
  jobId: string
): Promise<SynthesisResult> {
  await jobService.appendTraceEvent(jobId, {
    agent: 'SynthesisEngine',
    status: 'running',
    timestamp: new Date().toISOString(),
    detail: 'Combining clinical and patent data with enhanced analytics',
  });

  try {
    // Build features for each molecule
    const moleculeSet = new Set<string>();
    
    clinicalResult.byMolecule.forEach(m => moleculeSet.add(m.molecule));
    patentResult.byMolecule.forEach(m => moleculeSet.add(m.molecule));

    const features: MoleculeFeatures[] = [];
    const maxTrials = Math.max(...clinicalResult.byMolecule.map(m => m.trialCount), 1);

    for (const molecule of moleculeSet) {
      const clinical = clinicalResult.byMolecule.find(m => m.molecule === molecule);
      const patent = patentResult.byMolecule.find(m => m.molecule === molecule);

      const trialCount = clinical?.trialCount || 0;
      const patentCount = patent?.citations.length || 0;
      
      // Clinical intensity: normalized trial count (higher = more activity)
      const clinicalIntensity = trialCount / maxTrials;
      
      // Competition score: combination of trials and sponsors
      const sponsorCount = clinical?.sponsors.length || 0;
      const competitionScore = (trialCount * 0.6 + sponsorCount * 0.4) / (maxTrials + 5);
      
      // FTO flag from patents
      const ftoFlag = patent?.ftoFlag || 'LOW';

      features.push({
        molecule,
        clinicalIntensity,
        competitionScore,
        ftoFlag,
        trialCount,
        patentCount,
        phases: clinical?.phases || {},
        sponsors: clinical?.sponsors || [],
        jurisdictions: patent?.jurisdictions || [],
        countries: clinical?.countries || [],
        yearsToExpiry: patent?.yearsToExpiry || 0,
      });
    }

    await jobService.appendTraceEvent(jobId, {
      agent: 'SynthesisEngine',
      status: 'running',
      timestamp: new Date().toISOString(),
      detail: `Analyzing ${features.length} molecules with enhanced scoring`,
    });

    // Calculate enhanced analytics for each molecule
    const enhancedFeatures = features.map(f => {
      const competitiveAnalysis = calculateCompetitiveAnalysis(f);
      const licensingAnalysis = calculateLicensingSignal(f);
      const geoReadiness = calculateGeoReadiness(f);
      const scoreBreakdown = calculateScoreBreakdown(f, licensingAnalysis.signal);
      
      return {
        ...f,
        competitiveAnalysis,
        licensingAnalysis,
        geoReadiness,
        scoreBreakdown,
      };
    });

    // Prepare prompt for Gemini
    const moleculeSummary = enhancedFeatures.slice(0, 15).map(f => ({
      molecule: f.molecule,
      trials: f.trialCount,
      patents: f.patentCount,
      competition: f.competitiveAnalysis.intensity,
      ftoRisk: f.ftoFlag,
      phases: f.phases,
      licensingSignal: f.licensingAnalysis.signal,
      calculatedScore: f.scoreBreakdown.total,
    }));

    const prompt = `You are a pharmaceutical market analyst. Analyze these molecules and rank them based on the user's query.

User Query: "${queryText}"

Molecule Data:
${JSON.stringify(moleculeSummary, null, 2)}

Instructions:
1. Consider FTO risk (LOW is better for freedom to operate)
2. Consider competition level (UNDERCROWDED often better for new entrants)
3. Consider licensing signals (STRONG = good BD opportunity)
4. Consider clinical activity (Phase III = proven efficacy)
5. Use the calculatedScore as a baseline but adjust based on query fit

Return a JSON array of the top 5-8 opportunities with this EXACT format:
[
  {
    "molecule": "MoleculeName",
    "rank": 1,
    "confidence": 0.92,
    "rationale": "Detailed 1-2 sentence explanation"
  }
]

Return ONLY the JSON array, no markdown.`;

    let opportunities: Opportunity[] = [];

    try {
      const response = await callGemini(prompt);
      const jsonStr = extractJson(response);
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        opportunities = parsed.map((item: any, index: number) => {
          const feat = enhancedFeatures.find(f => f.molecule === item.molecule);
          return {
            molecule: item.molecule || 'Unknown',
            rank: item.rank || index + 1,
            confidence: typeof item.confidence === 'number' ? item.confidence : 
              (feat?.scoreBreakdown.total || 0.5),
            rationale: item.rationale || 'Analysis pending',
            ftoFlag: feat?.ftoFlag || 'MEDIUM',
            scoreBreakdown: feat?.scoreBreakdown,
            competitiveAnalysis: feat?.competitiveAnalysis,
            licensingAnalysis: feat?.licensingAnalysis,
            geoReadiness: feat?.geoReadiness,
          };
        });
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response, using heuristic ranking');
      
      // Fallback: rank by score breakdown total
      const sorted = enhancedFeatures
        .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)
        .slice(0, 8);

      opportunities = sorted.map((f, index) => ({
        molecule: f.molecule,
        rank: index + 1,
        confidence: f.scoreBreakdown.total,
        rationale: `${f.ftoFlag} FTO risk, ${f.licensingAnalysis.signal} licensing signal, ${f.competitiveAnalysis.intensity} market, ${f.trialCount} trial(s)`,
        ftoFlag: f.ftoFlag,
        scoreBreakdown: f.scoreBreakdown,
        competitiveAnalysis: f.competitiveAnalysis,
        licensingAnalysis: f.licensingAnalysis,
        geoReadiness: f.geoReadiness,
      }));
    }

    // ============================================
    // Calculate Market Insights
    // ============================================
    const marketInsights: MarketInsights = {
      totalMoleculesAnalyzed: features.length,
      lowFtoCount: features.filter(f => f.ftoFlag === 'LOW').length,
      mediumFtoCount: features.filter(f => f.ftoFlag === 'MEDIUM').length,
      highFtoCount: features.filter(f => f.ftoFlag === 'HIGH').length,
      avgCompetitionIndex: Math.round(
        enhancedFeatures.reduce((sum, f) => sum + f.competitiveAnalysis.indexScore, 0) / 
        Math.max(1, enhancedFeatures.length)
      ),
      strongLicensingCandidates: enhancedFeatures.filter(
        f => f.licensingAnalysis.signal === 'STRONG'
      ).length,
    };

    // ============================================
    // Calculate Confidence Decomposition
    // ============================================
    const avgDataConfidence = opportunities.length > 0
      ? opportunities.reduce((sum, o) => {
          const breakdown = o.scoreBreakdown;
          if (breakdown) {
            // Data confidence = trial + fto + phase components
            return sum + (breakdown.trialScore + Math.abs(breakdown.ftoAdjustment) + breakdown.phaseBonus);
          }
          return sum + 0.3;
        }, 0) / opportunities.length
      : 0.3;

    const overallConfidence = opportunities.length > 0
      ? opportunities.reduce((sum, o) => sum + o.confidence, 0) / opportunities.length
      : 0.5;

    const confidenceDecomposition: ConfidenceDecomposition = {
      overall: Math.round(overallConfidence * 100) / 100,
      dataConfidence: Math.round(Math.min(0.95, avgDataConfidence * 2) * 100) / 100,
      aiConfidence: Math.round(Math.max(0, overallConfidence - avgDataConfidence) * 100) / 100,
      breakdown: {
        trialDataScore: Math.round(
          (clinicalResult.byMolecule.length > 0 ? 0.3 : 0) * 100
        ) / 100,
        patentDataScore: Math.round(
          (patentResult.byMolecule.length > 0 ? 0.3 : 0) * 100
        ) / 100,
        aiAnalysisScore: Math.round(0.2 * 100) / 100,
      },
    };

    await jobService.appendTraceEvent(jobId, {
      agent: 'SynthesisEngine',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Identified ${opportunities.length} opportunities. ${marketInsights.strongLicensingCandidates} strong licensing candidates. Avg confidence: ${(overallConfidence * 100).toFixed(0)}%`,
    });

    return {
      opportunities,
      overallConfidence,
      confidenceDecomposition,
      marketInsights,
    };
  } catch (error) {
    await jobService.appendTraceEvent(jobId, {
      agent: 'SynthesisEngine',
      status: 'error',
      timestamp: new Date().toISOString(),
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
