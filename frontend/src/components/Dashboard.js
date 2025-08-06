import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import toast from 'react-hot-toast';

function Dashboard({ status }) {
  const [models, setModels] = useState([]);
  const [usage, setUsage] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelsData, usageData, keysData] = await Promise.all([
          ApiService.getModels(),
          ApiService.getUsageDetails(),
          ApiService.getApiKeysStatus()
        ]);
        
        setModels(modelsData.data || []);
        setUsage(usageData);
        setApiKeys(keysData.api_keys || []);
      } catch (error) {
        toast.error('Failed to fetch dashboard data');
        console.error('Dashboard data error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">
          OpenRouter <span className="text-primary-500">Clone</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Unified API gateway providing access to multiple AI models through a single endpoint. 
          Route requests intelligently with automatic fallback and load balancing.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-effect rounded-lg p-6 hover-glow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Status</p>
              <p className="text-2xl font-semibold text-white capitalize">
                {status?.status || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover-glow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">🔑</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Active Keys</p>
              <p className="text-2xl font-semibold text-white">
                {status?.active_keys || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover-glow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Requests</p>
              <p className="text-2xl font-semibold text-white">
                {status?.total_requests || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6 hover-glow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">⚡</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Error Rate</p>
              <p className="text-2xl font-semibold text-white">
                {status?.error_rate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🚀 Quick Start</h2>
        <div className="space-y-4">
          <p className="text-gray-300">
            Get started with the OpenRouter Clone API in just a few steps:
          </p>
          
          <div className="bg-dark-200 rounded-lg p-4 font-mono text-sm">
            <div className="text-gray-400 mb-2"># 1. Make a chat completion request</div>
            <pre className="text-green-400">
{`curl -X POST "${process.env.REACT_APP_BACKEND_URL}/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'`}
            </pre>
          </div>

          <div className="bg-dark-200 rounded-lg p-4 font-mono text-sm">
            <div className="text-gray-400 mb-2"># 2. List available models</div>
            <pre className="text-blue-400">
{`curl -X GET "${process.env.REACT_APP_BACKEND_URL}/v1/models" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </pre>
          </div>

          <div className="flex flex-wrap gap-4 mt-6">
            <a 
              href="/playground" 
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Playground
            </a>
            <a 
              href="/models" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              View Models
            </a>
          </div>
        </div>
      </div>

      {/* Available Models Preview */}
      <div className="glass-effect rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Available Models</h2>
          <span className="text-sm text-gray-400">{models.length} models</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.slice(0, 6).map((model) => (
            <div key={model.id} className="bg-dark-200 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-white">{model.id}</h3>
                <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">
                  {model.owned_by}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{model.description}</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Context: {model.context_length.toLocaleString()}</span>
                <span className="text-green-400">
                  ${model.pricing.prompt * 1000}K tokens
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {models.length > 6 && (
          <div className="text-center mt-4">
            <a href="/models" className="text-primary-400 hover:text-primary-300">
              View all {models.length} models →
            </a>
          </div>
        )}
      </div>

      {/* API Keys Status */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">API Keys Status</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Key ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Errors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {apiKeys.slice(0, 5).map((key) => (
                <tr key={key.key_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {key.key_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {key.usage_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {key.error_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      key.is_active 
                        ? 'bg-green-900 text-green-200' 
                        : 'bg-red-900 text-red-200'
                    }`}>
                      {key.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;