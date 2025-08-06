import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import toast from 'react-hot-toast';

function Analytics() {
  const [usage, setUsage] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [usageData, keysData, statusData] = await Promise.all([
          ApiService.getUsageDetails(),
          ApiService.getApiKeysStatus(),
          ApiService.getStatus()
        ]);
        
        setUsage(usageData);
        setApiKeys(keysData.api_keys || []);
        setStatus(statusData);
      } catch (error) {
        toast.error('Failed to fetch analytics data');
        console.error('Analytics error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const totalRequests = apiKeys.reduce((sum, key) => sum + key.usage_count, 0);
  const totalErrors = apiKeys.reduce((sum, key) => sum + key.error_count, 0);
  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-gray-300">
          Monitor API usage, performance, and costs across all models
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Requests</p>
              <p className="text-2xl font-semibold text-white">
                {totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Error Rate</p>
              <p className="text-2xl font-semibold text-white">
                {errorRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🔑</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Active Keys</p>
              <p className="text-2xl font-semibold text-white">
                {apiKeys.filter(key => key.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏱️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Uptime</p>
              <p className="text-2xl font-semibold text-white">
                {status?.uptime || '24h'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage by Model */}
      {usage?.usage_by_model && usage.usage_by_model.length > 0 && (
        <div className="glass-effect rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Usage by Model</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {usage.usage_by_model.map((model) => (
                  <tr key={model._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {model._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {model.total_requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {model.total_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      ${(model.total_cost || 0).toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Key Performance */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">API Key Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apiKeys.map((key) => {
            const successRate = key.usage_count > 0 
              ? ((key.usage_count - key.error_count) / key.usage_count * 100).toFixed(1)
              : 100;
            
            return (
              <div key={key.key_id} className="bg-dark-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">{key.key_id}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    key.is_active 
                      ? 'bg-green-900 text-green-200' 
                      : 'bg-red-900 text-red-200'
                  }`}>
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requests:</span>
                    <span className="text-white">{key.usage_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Errors:</span>
                    <span className="text-red-400">{key.error_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate:</span>
                    <span className={`${successRate >= 95 ? 'text-green-400' : successRate >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {successRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Used:</span>
                    <span className="text-gray-300 text-xs">
                      {key.last_used 
                        ? new Date(key.last_used).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>

                {/* Progress bar for success rate */}
                <div className="mt-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        successRate >= 95 ? 'bg-green-500' : 
                        successRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Health */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center ${
              status?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              <span className="text-white text-2xl">
                {status?.status === 'healthy' ? '✅' : '⚠️'}
              </span>
            </div>
            <h3 className="text-lg font-medium text-white capitalize">
              {status?.status || 'Unknown'}
            </h3>
            <p className="text-sm text-gray-400">Overall Status</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-white">
              {status?.uptime || '24h'}
            </h3>
            <p className="text-sm text-gray-400">Uptime</p>
          </div>
          
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center ${
              (status?.error_rate || 0) < 5 ? 'bg-green-500' : 'bg-red-500'
            }`}>
              <span className="text-white text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-medium text-white">
              {status?.error_rate || 0}%
            </h3>
            <p className="text-sm text-gray-400">Error Rate</p>
          </div>
        </div>
      </div>

      {/* Refresh Notice */}
      <div className="text-center text-sm text-gray-400">
        Data refreshes automatically every 30 seconds
      </div>
    </div>
  );
}

export default Analytics;