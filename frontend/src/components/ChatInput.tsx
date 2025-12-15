import React, { useState } from 'react';

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Pharmaceutical Intelligence Query</h2>
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
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
};
