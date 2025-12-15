import React, { useState } from 'react';
import type { ReportResponse, Opportunity, ScoreBreakdown } from '../api/client';

interface DashboardProps {
  report: ReportResponse;
  onSuggestedQuery?: (query: string) => void;
}

const getFtoColor = (flag: string) => {
  switch (flag) {
    case 'LOW':
      return 'text-green-600 bg-green-50';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-50';
    case 'HIGH':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getLicensingColor = (signal: string) => {
  switch (signal) {
    case 'STRONG':
      return 'text-green-600 bg-green-50';
    case 'MODERATE':
      return 'text-blue-600 bg-blue-50';
    case 'WEAK':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getCompetitionColor = (intensity: string) => {
  switch (intensity) {
    case 'UNDERCROWDED':
      return 'text-green-600 bg-green-50';
    case 'COMPETITIVE':
      return 'text-yellow-600 bg-yellow-50';
    case 'SATURATED':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

// Score Breakdown Component
const ScoreBreakdownPanel: React.FC<{ breakdown: ScoreBreakdown }> = ({ breakdown }) => {
  const items = [
    { label: 'Base Score', value: breakdown.baseScore, color: 'bg-gray-400' },
    { label: 'Trial Activity', value: breakdown.trialScore, color: 'bg-blue-500' },
    { label: 'FTO Adjustment', value: breakdown.ftoAdjustment, color: breakdown.ftoAdjustment >= 0 ? 'bg-green-500' : 'bg-red-500' },
    { label: 'Phase Bonus', value: breakdown.phaseBonus, color: 'bg-purple-500' },
    { label: 'Competition', value: -breakdown.competitionPenalty, color: 'bg-orange-500' },
    { label: 'Licensing Bonus', value: breakdown.licensingBonus, color: 'bg-teal-500' },
  ];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-2">
      <div className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`${item.color} h-1.5 rounded-full`}
                  style={{ width: `${Math.abs(item.value) * 100}%` }}
                />
              </div>
              <span className={`font-mono ${item.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.value >= 0 ? '+' : ''}{(item.value * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-blue-600">{(breakdown.total * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

// Expandable Opportunity Row
const OpportunityRow: React.FC<{ opp: Opportunity }> = ({ opp }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{opp.rank}</td>
        <td className="px-4 py-3">
          <div className="text-sm font-semibold text-blue-600">{opp.molecule}</div>
          {opp.licensingAnalysis && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getLicensingColor(opp.licensingAnalysis.signal)}`}>
              {opp.licensingAnalysis.signal} Licensing
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${opp.confidence * 100}%` }}
              />
            </div>
            <span>{(opp.confidence * 100).toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFtoColor(opp.ftoFlag)}`}>
            {opp.ftoFlag}
          </span>
        </td>
        <td className="px-4 py-3">
          {opp.competitiveAnalysis && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCompetitionColor(opp.competitiveAnalysis.intensity)}`}>
              {opp.competitiveAnalysis.intensity}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {opp.rationale}
          <span className="ml-2 text-blue-500">{expanded ? '▲' : '▼'}</span>
        </td>
      </tr>
      {expanded && opp.scoreBreakdown && (
        <tr>
          <td colSpan={6} className="px-4 py-2 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreBreakdownPanel breakdown={opp.scoreBreakdown} />
              
              {opp.licensingAnalysis && opp.licensingAnalysis.reasons.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-blue-700 mb-2">Licensing Signals</div>
                  <ul className="text-xs text-blue-600 space-y-1">
                    {opp.licensingAnalysis.reasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {opp.geoReadiness && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-700 mb-2">Geographic Readiness</div>
                  <div className="space-y-1">
                    {opp.geoReadiness.filter(g => g.readinessScore > 0).slice(0, 4).map((geo) => (
                      <div key={geo.country} className="flex items-center justify-between text-xs">
                        <span>{geo.country}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full"
                              style={{ width: `${geo.readinessScore * 100}%` }}
                            />
                          </div>
                          <span className="text-purple-600">{(geo.readinessScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ report, onSuggestedQuery }) => {
  return (
    <div className="space-y-6">
      {/* Header Card with Confidence Decomposition */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
        <p className="text-blue-100 mb-4">{report.queryText}</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-sm opacity-90">Overall Confidence</div>
            <div className="text-3xl font-bold">{(report.confidence * 100).toFixed(0)}%</div>
            {report.confidenceDecomposition && (
              <div className="text-xs opacity-75 mt-1">
                Data: {(report.confidenceDecomposition.dataConfidence * 100).toFixed(0)}% | 
                AI: {(report.confidenceDecomposition.aiConfidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-sm opacity-90">Opportunities</div>
            <div className="text-3xl font-bold">{report.opportunities.length}</div>
          </div>
          {report.marketInsights && (
            <>
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <div className="text-sm opacity-90">Licensing Candidates</div>
                <div className="text-3xl font-bold">{report.marketInsights.strongLicensingCandidates}</div>
                <div className="text-xs opacity-75">Strong signal</div>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <div className="text-sm opacity-90">Low FTO Risk</div>
                <div className="text-3xl font-bold">{report.marketInsights.lowFtoCount}</div>
                <div className="text-xs opacity-75">of {report.marketInsights.totalMoleculesAnalyzed} analyzed</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Executive Summary</h3>
        <p className="text-gray-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* Market Insights Bar */}
      {report.marketInsights && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Market Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{report.marketInsights.totalMoleculesAnalyzed}</div>
              <div className="text-sm text-gray-600">Molecules Analyzed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{report.marketInsights.lowFtoCount}</div>
              <div className="text-sm text-gray-600">Low FTO Risk</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{report.marketInsights.mediumFtoCount}</div>
              <div className="text-sm text-gray-600">Medium FTO Risk</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{report.marketInsights.highFtoCount}</div>
              <div className="text-sm text-gray-600">High FTO Risk</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700">{report.marketInsights.avgCompetitionIndex}</div>
              <div className="text-xs text-gray-500">Avg Competition Index</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{report.marketInsights.strongLicensingCandidates}</div>
              <div className="text-xs text-gray-500">Strong Licensing Candidates</div>
            </div>
          </div>
        </div>
      )}

      {/* Patent Cliff Radar */}
      {report.patentCliff && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Patent Cliff Radar</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border-l-4 border-green-500 pl-4">
              <div className="text-sm font-semibold text-gray-700">Already Expired</div>
              <div className="text-2xl font-bold text-green-600">{report.patentCliff.alreadyExpired.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.patentCliff.alreadyExpired.slice(0, 2).map(p => p.molecule).join(', ')}
                {report.patentCliff.alreadyExpired.length > 2 && '...'}
              </div>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="text-sm font-semibold text-gray-700">Expiring in 1 Year</div>
              <div className="text-2xl font-bold text-blue-600">{report.patentCliff.expiring1Year.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.patentCliff.expiring1Year.slice(0, 2).map(p => p.molecule).join(', ')}
                {report.patentCliff.expiring1Year.length > 2 && '...'}
              </div>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <div className="text-sm font-semibold text-gray-700">Expiring in 3 Years</div>
              <div className="text-2xl font-bold text-yellow-600">{report.patentCliff.expiring3Years.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.patentCliff.expiring3Years.slice(0, 2).map(p => p.molecule).join(', ')}
                {report.patentCliff.expiring3Years.length > 2 && '...'}
              </div>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <div className="text-sm font-semibold text-gray-700">Expiring in 5 Years</div>
              <div className="text-2xl font-bold text-orange-600">{report.patentCliff.expiring5Years.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.patentCliff.expiring5Years.slice(0, 2).map(p => p.molecule).join(', ')}
                {report.patentCliff.expiring5Years.length > 2 && '...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Opportunities with Explainability */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Top Opportunities</h3>
        <p className="text-xs text-gray-500 mb-4">Click any row to see detailed score breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Molecule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">FTO Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Competition</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.opportunities.map((opp) => (
                <OpportunityRow key={opp.molecule} opp={opp} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Trials Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Clinical Trials Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.trialsSummary.byMolecule.slice(0, 6).map((mol) => (
            <div key={mol.molecule} className="border border-gray-200 rounded-lg p-4">
              <div className="font-semibold text-gray-800 mb-2">{mol.molecule}</div>
              <div className="text-sm text-gray-600 mb-2">{mol.trialCount} trial(s)</div>
              <div className="text-xs text-gray-500">
                Phases: {Object.entries(mol.phases).map(([phase, count]) => `${phase}: ${count}`).join(', ')}
              </div>
              {mol.countries && mol.countries.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Countries: {mol.countries.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Patent Landscape */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Patent Landscape</h3>
        <p className="text-xs text-gray-500 mb-3">FTO risk is based on the latest (blocking) patent expiry date</p>
        <div className="space-y-3">
          {report.patentSummary.byMolecule.slice(0, 5).map((mol) => (
            <div key={mol.molecule} className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="font-semibold text-gray-800">{mol.molecule}</div>
                <div className="text-sm text-gray-600">
                  Latest Expiry: {mol.latestExpiry || mol.earliestExpiry} | Jurisdictions: {mol.jurisdictions.join(', ')}
                  {mol.yearsToExpiry !== undefined && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({mol.yearsToExpiry > 0 ? `${mol.yearsToExpiry.toFixed(1)} years left` : 'Expired'})
                    </span>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getFtoColor(mol.ftoFlag)}`}>
                {mol.ftoFlag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Recommended Next Steps</h3>
        <ol className="list-decimal list-inside space-y-2">
          {report.recommendations.map((rec, index) => (
            <li key={index} className="text-gray-700">
              {rec}
            </li>
          ))}
        </ol>
      </div>

      {/* Suggested Follow-up Queries */}
      {report.suggestedQueries && report.suggestedQueries.length > 0 && onSuggestedQuery && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Suggested Next Questions</h3>
          <div className="flex flex-wrap gap-2">
            {report.suggestedQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => onSuggestedQuery(query)}
                className="px-4 py-2 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download PDF */}
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <a
          href={`http://localhost:3001${report.pdfUrl}`}
          download
          className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          📄 Download Full PDF Report
        </a>
      </div>
    </div>
  );
};
