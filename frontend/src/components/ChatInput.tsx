import React, { useState } from 'react';

interface QueryTemplate {
  id: string;
  label: string;
  query: string;
  category: 'market-entry' | 'competitive' | 'regulatory' | 'patent';
}

const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: 'india-respiratory',
    label: 'India Respiratory Market',
    query: 'Find molecules with low competition but high patient burden in respiratory disease in India',
    category: 'market-entry',
  },
  {
    id: 'patent-cliff',
    label: 'Upcoming Patent Cliffs',
    query: 'Find molecules with patents expiring in the next 2 years with high market potential',
    category: 'patent',
  },
  {
    id: 'oncology-fto',
    label: 'Oncology FTO Analysis',
    query: 'Analyze oncology molecules with freedom to operate potential and Phase 3 trials',
    category: 'competitive',
  },
  {
    id: 'cardio-emerging',
    label: 'Cardiovascular Emerging Markets',
    query: 'Evaluate cardiovascular treatments for emerging markets with regulatory pathway analysis',
    category: 'market-entry',
  },
  {
    id: 'biosimilar-opp',
    label: 'Biosimilar Opportunities',
    query: 'Identify biologics with expiring patents suitable for biosimilar development',
    category: 'patent',
  },
  {
    id: 'cns-pipeline',
    label: 'CNS Pipeline Review',
    query: 'Review CNS pipeline molecules in Phase 2-3 with low competitive intensity',
    category: 'competitive',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'market-entry': 'bg-green-100 text-green-700 border-green-200',
  'competitive': 'bg-blue-100 text-blue-700 border-blue-200',
  'regulatory': 'bg-purple-100 text-purple-700 border-purple-200',
  'patent': 'bg-orange-100 text-orange-700 border-orange-200',
};

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query);
    }
  };

  const handleTemplateClick = (template: QueryTemplate) => {
    setQuery(template.query);
    setShowTemplates(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Pharmaceutical Intelligence Query</h2>
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Templates
        </button>
      </div>

      {/* Query Templates Panel */}
      {showTemplates && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-3">Click a template to use as starting point:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {QUERY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                disabled={isLoading}
                className={`text-left p-3 rounded-lg border transition-all hover:shadow-md disabled:opacity-50 ${CATEGORY_COLORS[template.category]}`}
              >
                <div className="font-medium text-sm">{template.label}</div>
                <div className="text-xs mt-1 opacity-75 line-clamp-2">{template.query}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query... (e.g., 'Find molecules with low competition but high patient burden in respiratory disease in India')"
          className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-gray-700"
          disabled={isLoading}
        />
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {query.length > 0 && `${query.length} characters`}
          </div>
          <div className="flex gap-2">
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="px-4 py-3 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
