import React from 'react';
import type { AgentTraceEvent } from '../api/client';

interface AgentTimelineProps {
  events: AgentTraceEvent[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'running':
      return 'bg-blue-500 animate-pulse';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return '✓';
    case 'running':
      return '⋯';
    case 'error':
      return '✗';
    default:
      return '○';
  }
};

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ events }) => {
  // Group events by agent
  const agentGroups = events.reduce((acc, event) => {
    if (!acc[event.agent]) {
      acc[event.agent] = [];
    }
    acc[event.agent].push(event);
    return acc;
  }, {} as Record<string, AgentTraceEvent[]>);

  const agents = ['MasterAgent', 'Cache', 'ClinicalTrialsAgent', 'PatentAgent', 'SynthesisEngine', 'ReportGenerator'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Agent Orchestration</h2>
      <div className="space-y-4">
        {agents.map((agentName) => {
          const agentEvents = agentGroups[agentName] || [];
          const latestEvent = agentEvents[agentEvents.length - 1];
          
          if (!latestEvent) return null;

          return (
            <div key={agentName} className="border-l-4 border-gray-200 pl-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getStatusColor(
                    latestEvent.status
                  )}`}
                >
                  {getStatusIcon(latestEvent.status)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{agentName}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Status: <span className="capitalize">{latestEvent.status}</span>
                  </div>
                  {latestEvent.detail && (
                    <div className="text-xs text-gray-500 mt-1">{latestEvent.detail}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(latestEvent.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 && (
        <div className="text-center text-gray-400 py-8">No agent activity yet</div>
      )}
    </div>
  );
};
