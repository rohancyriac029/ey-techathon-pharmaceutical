import { useState, useEffect } from 'react';
import { ChatInput } from './components/ChatInput';
import { AgentTimeline } from './components/AgentTimeline';
import { Dashboard } from './components/Dashboard';
import { api } from './api/client';
import type { AgentTraceEvent, ReportResponse } from './api/client';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [trace, setTrace] = useState<AgentTraceEvent[]>([]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for job status and trace
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'error') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const [status, traceData] = await Promise.all([
          api.getJobStatus(jobId),
          api.getTrace(jobId),
        ]);

        setJobStatus(status.status);
        setTrace(traceData);

        if (status.status === 'completed') {
          const reportData = await api.getReport(jobId);
          setReport(reportData);
          setIsLoading(false);
        } else if (status.status === 'error') {
          setError('Analysis failed. Please try again.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId, jobStatus]);

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setTrace([]);
    setJobStatus('');

    try {
      const result = await api.createQuery(query);
      setJobId(result.jobId);
      setJobStatus(result.status);
    } catch (err) {
      setError('Failed to submit query. Make sure the backend is running.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🧬 Pharmaceutical Intelligence Platform
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered drug discovery and market analysis
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Query Input */}
          <div className="lg:col-span-1">
            <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
            
            {/* Agent Timeline */}
            {trace.length > 0 && (
              <div className="mt-6">
                <AgentTimeline events={trace} />
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {isLoading && !report && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-xl font-semibold text-gray-700">Analyzing...</div>
                <div className="text-gray-500 mt-2">
                  {jobStatus === 'running' ? 'Running analysis pipeline' : 'Initializing...'}
                </div>
              </div>
            )}

            {report && <Dashboard report={report} />}

            {!isLoading && !report && !error && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🔬</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Ready to Analyze</h2>
                <p className="text-gray-500">
                  Enter a query to discover pharmaceutical opportunities using AI-powered analysis
                </p>
                <div className="mt-6 text-left max-w-md mx-auto">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Example queries:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Find molecules with low competition in respiratory disease in India</li>
                    <li>• Identify high patient burden areas with expiring patents</li>
                    <li>• Analyze COPD treatment landscape in emerging markets</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
