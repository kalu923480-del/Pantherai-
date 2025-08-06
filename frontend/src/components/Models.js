import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import toast from 'react-hot-toast';

function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await ApiService.getModels();
        setModels(data.data || []);
      } catch (error) {
        toast.error('Failed to fetch models');
        console.error('Models fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Filter models based on category and search
  const filteredModels = models.filter(model => {
    const matchesSearch = model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    return matchesSearch && model.owned_by === selectedCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(models.map(model => model.owned_by))];

  const getModelIcon = (ownedBy) => {
    const icons = {
      'openai': '🤖',
      'anthropic': '🧠', 
      'google': '🔍',
      'mistral': '⚡',
      'meta': '📱'
    };
    return icons[ownedBy] || '🤖';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Available Models</h1>
        <p className="text-lg text-gray-300">
          Choose from {models.length} AI models across multiple providers
        </p>
      </div>

      {/* Search and Filter */}
      <div className="glass-effect rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-dark-200 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-200 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <div key={model.id} className="glass-effect rounded-lg p-6 hover-glow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{getModelIcon(model.owned_by)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{model.id}</h3>
                  <p className="text-sm text-gray-400 capitalize">{model.owned_by}</p>
                </div>
              </div>
              <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded">
                Active
              </span>
            </div>

            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
              {model.description}
            </p>

            <div className="space-y-3">
              {/* Context Length */}
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Context Length:</span>
                <span className="text-white text-sm font-medium">
                  {model.context_length.toLocaleString()} tokens
                </span>
              </div>

              {/* Pricing */}
              <div className="bg-dark-200 rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-xs">Input:</span>
                  <span className="text-green-400 text-xs font-medium">
                    ${(model.pricing.prompt * 1000).toFixed(4)}/1K tokens
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Output:</span>
                  <span className="text-green-400 text-xs font-medium">
                    ${(model.pricing.completion * 1000).toFixed(4)}/1K tokens
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="text-gray-400 text-xs mb-2">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {model.capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(model.id);
                    toast.success('Model ID copied to clipboard');
                  }}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Copy ID
                </button>
                <button 
                  onClick={() => window.open('/playground', '_blank')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Try Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-white mb-2">No models found</h3>
          <p className="text-gray-400">
            Try adjusting your search query or filter settings.
          </p>
        </div>
      )}

      {/* API Example */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Using the Models API</h2>
        <div className="bg-dark-200 rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <div className="text-gray-400 mb-2"># List all models</div>
          <pre className="text-blue-400 mb-4">
{`curl -X GET "${process.env.REACT_APP_BACKEND_URL}/v1/models" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          </pre>
          
          <div className="text-gray-400 mb-2"># Use a specific model</div>
          <pre className="text-green-400">
{`curl -X POST "${process.env.REACT_APP_BACKEND_URL}/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${filteredModels[0]?.id || 'gpt-4'}",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Models;