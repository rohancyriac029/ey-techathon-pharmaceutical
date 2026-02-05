import React, { useState } from 'react';
import type { ReportResponse, MoleculeDecision, CountryRecommendation, CommercialStrategy } from '../api/client';

interface DashboardProps {
  report: ReportResponse;
  onSuggestedQuery?: (query: string) => void;
}

// Simple markdown to JSX converter for executive summary
const renderMarkdown = (text: string) => {
  if (!text) return null;
  
  // Split by paragraphs (double newlines)
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, idx) => {
    // Convert **bold** to <strong>
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    
    const content = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
    
    return (
      <p key={idx} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
        {content}
      </p>
    );
  });
};

// Strategy color mapping
const getStrategyColor = (strategy: CommercialStrategy) => {
  switch (strategy) {
    case 'LICENSE':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'GENERIC':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'WAIT':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'DROP':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'LOW':
      return 'text-green-600';
    case 'MEDIUM':
      return 'text-yellow-600';
    case 'HIGH':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getGoNoGoColor = (goNoGo: string) => {
  switch (goNoGo) {
    case 'GO':
      return 'bg-green-500 text-white';
    case 'NO-GO':
      return 'bg-red-500 text-white';
    case 'CONDITIONAL':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

// Country Recommendation Card
const CountryCard: React.FC<{ rec: CountryRecommendation }> = ({ rec }) => (
  <div className="border rounded-lg p-4 bg-gray-50">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{rec.country === 'IN' ? '🇮🇳' : '🇺🇸'}</span>
        <span className="font-semibold text-gray-800">{rec.country === 'IN' ? 'India' : 'United States'}</span>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGoNoGoColor(rec.goNoGo)}`}>
        {rec.goNoGo}
      </span>
    </div>
    
    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border mb-3 ${getStrategyColor(rec.strategy)}`}>
      {rec.strategy}
    </div>
    
    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
      <div>
        <div className="text-gray-500">Time to Market</div>
        <div className="font-semibold">{rec.timeToMarketYears} years</div>
      </div>
      <div>
        <div className="text-gray-500">Est. Revenue</div>
        <div className="font-semibold">{formatCurrency(rec.estimatedRevenueUSD)}</div>
      </div>
      <div>
        <div className="text-gray-500">Risk</div>
        <div className={`font-semibold ${getRiskColor(rec.commercialRisk)}`}>{rec.commercialRisk}</div>
      </div>
    </div>
    
    <p className="text-sm text-gray-600">{rec.rationale}</p>
    
    {rec.conditions && rec.conditions.length > 0 && (
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-gray-500 mb-1">Conditions:</div>
        <ul className="text-xs text-gray-600 space-y-1">
          {rec.conditions.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// Molecule Decision Card
const MoleculeDecisionCard: React.FC<{ decision: MoleculeDecision }> = ({ decision }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl font-bold text-gray-400">#{decision.priorityRank}</span>
              <h3 className="text-xl font-bold text-gray-900">{decision.molecule}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getStrategyColor(decision.overallStrategy)}`}>
                {decision.overallStrategy}
              </span>
            </div>
            {decision.brandName && (
              <p className="text-sm text-gray-500 mb-1">Brand: {decision.brandName}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{decision.indication}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{decision.innovator}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{decision.modality}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-center ${getRiskColor(decision.overallRisk)}`}>
              <div className="text-xs text-gray-500">Risk</div>
              <div className="font-bold">{decision.overallRisk}</div>
            </div>
            <span className="text-blue-500 text-xl">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        
        {/* Summary pills */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 font-semibold mb-1">📋 FTO Summary</div>
            <p className="text-sm text-gray-700">{decision.ftoSummary}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 font-semibold mb-1">🧪 Clinical Summary</div>
            <p className="text-sm text-gray-700">{decision.clinicalSummary}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-600 font-semibold mb-1">💰 Market Summary</div>
            <p className="text-sm text-gray-700">{decision.marketSummary}</p>
          </div>
        </div>        
        {/* Patent Details */}
        {decision.patentDetails && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* India Patents */}
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-xs text-orange-600 font-semibold mb-2 flex items-center gap-1">
                🇮🇳 India Patents
              </div>
              {decision.patentDetails.IN.blocking.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-red-700 mb-1">🔒 Blocking ({decision.patentDetails.IN.blocking.length})</div>
                  {decision.patentDetails.IN.blocking.slice(0, 3).map((p, i) => (
                    <div key={i} className="text-xs text-gray-700 ml-2">
                      • <span className="font-mono">{p.patentNumber}</span> expires {new Date(p.expiryDate).toLocaleDateString()} 
                      <span className="text-gray-500"> ({p.patentType})</span>
                    </div>
                  ))}
                  {decision.patentDetails.IN.blocking.length > 3 && (
                    <div className="text-xs text-gray-500 ml-2">+ {decision.patentDetails.IN.blocking.length - 3} more</div>
                  )}
                </div>
              )}
              {decision.patentDetails.IN.expired.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-green-700 mb-1">✅ Expired ({decision.patentDetails.IN.expired.length})</div>
                  {decision.patentDetails.IN.expired.slice(0, 2).map((p, i) => (
                    <div key={i} className="text-xs text-gray-600 ml-2">
                      • <span className="font-mono">{p.patentNumber}</span> expired {new Date(p.expiryDate).toLocaleDateString()}
                    </div>
                  ))}
                  {decision.patentDetails.IN.expired.length > 2 && (
                    <div className="text-xs text-gray-500 ml-2">+ {decision.patentDetails.IN.expired.length - 2} more</div>
                  )}
                </div>
              )}
              {decision.patentDetails.IN.blocking.length === 0 && decision.patentDetails.IN.expired.length === 0 && (
                <div className="text-xs text-gray-500">No patents found</div>
              )}
            </div>

            {/* US Patents */}
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-semibold mb-2 flex items-center gap-1">
                🇺🇸 United States Patents
              </div>
              {decision.patentDetails.US.blocking.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-red-700 mb-1">🔒 Blocking ({decision.patentDetails.US.blocking.length})</div>
                  {decision.patentDetails.US.blocking.slice(0, 3).map((p, i) => (
                    <div key={i} className="text-xs text-gray-700 ml-2">
                      • <span className="font-mono">{p.patentNumber}</span> expires {new Date(p.expiryDate).toLocaleDateString()} 
                      <span className="text-gray-500"> ({p.patentType})</span>
                    </div>
                  ))}
                  {decision.patentDetails.US.blocking.length > 3 && (
                    <div className="text-xs text-gray-500 ml-2">+ {decision.patentDetails.US.blocking.length - 3} more</div>
                  )}
                </div>
              )}
              {decision.patentDetails.US.expired.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-green-700 mb-1">✅ Expired ({decision.patentDetails.US.expired.length})</div>
                  {decision.patentDetails.US.expired.slice(0, 2).map((p, i) => (
                    <div key={i} className="text-xs text-gray-600 ml-2">
                      • <span className="font-mono">{p.patentNumber}</span> expired {new Date(p.expiryDate).toLocaleDateString()}
                    </div>
                  ))}
                  {decision.patentDetails.US.expired.length > 2 && (
                    <div className="text-xs text-gray-500 ml-2">+ {decision.patentDetails.US.expired.length - 2} more</div>
                  )}
                </div>
              )}
              {decision.patentDetails.US.blocking.length === 0 && decision.patentDetails.US.expired.length === 0 && (
                <div className="text-xs text-gray-500">No patents found</div>
              )}
            </div>
          </div>
        )}      </div>
      
      {/* Expanded: Country Recommendations */}
      {expanded && (
        <div className="px-6 pb-6 border-t bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-4">Country Recommendations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decision.recommendations.map((rec) => (
              <CountryCard key={rec.country} rec={rec} />
            ))}
          </div>
          
          {/* Entry timelines */}
          {(decision.earliestEntryIN || decision.earliestEntryUS) && (
            <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
              {decision.earliestEntryIN && (
                <div>
                  <span className="text-gray-500">🇮🇳 Earliest Entry: </span>
                  <span className="font-semibold">{decision.earliestEntryIN}</span>
                </div>
              )}
              {decision.earliestEntryUS && (
                <div>
                  <span className="text-gray-500">🇺🇸 Earliest Entry: </span>
                  <span className="font-semibold">{decision.earliestEntryUS}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ report, onSuggestedQuery }) => {
  const hasDecisions = report.decisions && report.decisions.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
        <p className="text-blue-100 mb-4">{report.queryText}</p>
        
        {/* Strategy Summary Cards */}
        {report.strategySummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white/20 rounded-lg px-4 py-3">
              <div className="text-sm opacity-90">License</div>
              <div className="text-3xl font-bold">{report.strategySummary.license?.length || 0}</div>
              <div className="text-xs opacity-75 truncate">
                {report.strategySummary.license?.slice(0, 2).join(', ')}
              </div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-3">
              <div className="text-sm opacity-90">Generic</div>
              <div className="text-3xl font-bold">{report.strategySummary.generic?.length || 0}</div>
              <div className="text-xs opacity-75 truncate">
                {report.strategySummary.generic?.slice(0, 2).join(', ')}
              </div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-3">
              <div className="text-sm opacity-90">Wait</div>
              <div className="text-3xl font-bold">{report.strategySummary.wait?.length || 0}</div>
              <div className="text-xs opacity-75 truncate">
                {report.strategySummary.wait?.slice(0, 2).join(', ')}
              </div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-3">
              <div className="text-sm opacity-90">Drop</div>
              <div className="text-3xl font-bold">{report.strategySummary.drop?.length || 0}</div>
              <div className="text-xs opacity-75 truncate">
                {report.strategySummary.drop?.slice(0, 2).join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Executive Summary</h3>
        <div className="text-gray-700">
          {renderMarkdown(report.summary)}
        </div>
      </div>

      {/* Market Overview */}
      {report.marketOverview && report.marketOverview.totalAddressableMarketUSD > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Market Overview</h3>
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500">Total Addressable Market</div>
            <div className="text-4xl font-bold text-green-600">
              {formatCurrency(report.marketOverview.totalAddressableMarketUSD)}
            </div>
          </div>
          
          {report.marketOverview.byIndication && report.marketOverview.byIndication.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.marketOverview.byIndication.map((ind) => (
                <div key={ind.indication} className="border rounded-lg p-4 text-center">
                  <div className="font-semibold text-gray-800 mb-2">{ind.indication}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-500">🇮🇳 India</div>
                      <div className="font-semibold">{formatCurrency(ind.marketSizeIN)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">🇺🇸 US</div>
                      <div className="font-semibold">{formatCurrency(ind.marketSizeUS)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Patent Expiries */}
      {report.upcomingPatentExpiries && report.upcomingPatentExpiries.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Upcoming Patent Expiries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Molecule</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time to Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.upcomingPatentExpiries.map((exp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{exp.molecule}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg">{exp.country === 'IN' ? '🇮🇳' : '🇺🇸'}</span>
                      <span className="ml-2">{exp.country}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{exp.expiryDate}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${exp.yearsToExpiry <= 1 ? 'text-green-600' : exp.yearsToExpiry <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {exp.yearsToExpiry <= 0 ? 'Expired' : `${exp.yearsToExpiry.toFixed(1)} years`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Molecule Decisions */}
      {hasDecisions && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">🎯 Molecule Decisions</h3>
          <p className="text-sm text-gray-500">Click any card to see detailed country recommendations</p>
          {report.decisions.map((decision) => (
            <MoleculeDecisionCard key={decision.molecule} decision={decision} />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Recommended Next Steps</h3>
          <ol className="list-decimal list-inside space-y-2">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="text-gray-700">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

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
