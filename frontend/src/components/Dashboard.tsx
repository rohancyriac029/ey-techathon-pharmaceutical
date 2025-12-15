import React from 'react';
import type { ReportResponse } from '../api/client';

interface DashboardProps {
  report: ReportResponse;
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

export const Dashboard: React.FC<DashboardProps> = ({ report }) => {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
        <p className="text-blue-100 mb-4">{report.queryText}</p>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-sm opacity-90">Overall Confidence</div>
            <div className="text-3xl font-bold">{(report.confidence * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2">
            <div className="text-sm opacity-90">Opportunities Found</div>
            <div className="text-3xl font-bold">{report.opportunities.length}</div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Executive Summary</h3>
        <p className="text-gray-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* Top Opportunities */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Top Opportunities</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Molecule</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">FTO Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.opportunities.map((opp) => (
                <tr key={opp.molecule} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{opp.rank}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{opp.molecule}</td>
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
                  <td className="px-4 py-3 text-sm text-gray-600">{opp.rationale}</td>
                </tr>
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
