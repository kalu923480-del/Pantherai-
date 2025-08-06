import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import toast from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

function Playground() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([
    { role: 'user', content: 'Hello! How are you today?' }
  ]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    max_tokens: 1000,
    temperature: 0.7,
    top_p: 1.0
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await ApiService.getModels();
        const modelsList = data.data || [];
        setModels(modelsList);
        if (modelsList.length > 0) {
          setSelectedModel(modelsList[0].id);
        }
      } catch (error) {
        toast.error('Failed to fetch models');
      }
    };

    fetchModels();
  }, []);

  const addMessage = () => {
    setMessages([...messages, { role: 'user', content: '' }]);
  };

  const updateMessage = (index, field, value) => {
    const newMessages = [...messages];
    newMessages[index][field] = value;
    setMessages(newMessages);
  };

  const removeMessage = (index) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!selectedModel) {
      toast.error('Please select a model');
      return;
    }

    const validMessages = messages.filter(msg => msg.content.trim());
    if (validMessages.length === 0) {
      toast.error('Please add at least one message');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        model: selectedModel,
        messages: validMessages,
        ...settings
      };

      const result = await ApiService.createChatCompletion(requestData);
      setResponse(result);
      toast.success('Response generated successfully!');
    } catch (error) {
      toast.error('Failed to generate response');
      console.error('Playground error:', error);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const generateCurlCommand = () => {
    const validMessages = messages.filter(msg => msg.content.trim());
    const requestData = {
      model: selectedModel,
      messages: validMessages,
      ...settings
    };

    return `curl -X POST "${process.env.REACT_APP_BACKEND_URL}/v1/chat/completions" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(requestData, null, 2)}'`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">API Playground</h1>
        <p className="text-gray-300">
          Test your API requests and see live responses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Configuration */}
        <div className="space-y-6">
          <div className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Request</h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-primary-400 hover:text-primary-300 text-sm"
              >
                {showSettings ? 'Hide' : 'Show'} Settings
              </button>
            </div>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id} ({model.owned_by})
                  </option>
                ))}
              </select>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-4 p-4 bg-dark-200 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Max Tokens: {settings.max_tokens}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4000"
                    value={settings.max_tokens}
                    onChange={(e) => setSettings({
                      ...settings, 
                      max_tokens: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Temperature: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings({
                      ...settings, 
                      temperature: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Top P: {settings.top_p}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.top_p}
                    onChange={(e) => setSettings({
                      ...settings, 
                      top_p: parseFloat(e.target.value)
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Messages
                </label>
                <button
                  onClick={addMessage}
                  className="text-primary-400 hover:text-primary-300 text-sm"
                >
                  + Add Message
                </button>
              </div>

              {messages.map((message, index) => (
                <div key={index} className="bg-dark-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <select
                      value={message.role}
                      onChange={(e) => updateMessage(index, 'role', e.target.value)}
                      className="bg-dark-300 text-white text-sm px-2 py-1 rounded"
                    >
                      <option value="user">User</option>
                      <option value="assistant">Assistant</option>
                      <option value="system">System</option>
                    </select>
                    {messages.length > 1 && (
                      <button
                        onClick={() => removeMessage(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    value={message.content}
                    onChange={(e) => updateMessage(index, 'content', e.target.value)}
                    placeholder="Enter message content..."
                    rows="3"
                    className="w-full bg-dark-300 text-white text-sm p-2 rounded border border-gray-600 focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !selectedModel}
              className="w-full mt-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                '🚀 Send Request'
              )}
            </button>
          </div>

          {/* cURL Command */}
          <div className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">cURL Command</h3>
              <button
                onClick={() => copyToClipboard(generateCurlCommand())}
                className="text-primary-400 hover:text-primary-300 text-sm"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              language="bash"
              style={tomorrow}
              className="text-xs rounded-lg"
            >
              {generateCurlCommand()}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Response */}
        <div className="space-y-6">
          <div className="glass-effect rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Response</h2>
              {response && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                  className="text-primary-400 hover:text-primary-300 text-sm"
                >
                  Copy Response
                </button>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Generating response...</p>
                </div>
              </div>
            )}

            {response && !loading && (
              <div className="space-y-4">
                {/* Assistant Message */}
                <div className="bg-dark-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-400">Assistant:</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap">
                    {response.choices[0]?.message?.content || 'No content'}
                  </p>
                </div>

                {/* Usage Statistics */}
                <div className="bg-dark-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Usage</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Prompt:</span>
                      <p className="text-white font-medium">
                        {response.usage?.prompt_tokens || 0} tokens
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Completion:</span>
                      <p className="text-white font-medium">
                        {response.usage?.completion_tokens || 0} tokens
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <p className="text-white font-medium">
                        {response.usage?.total_tokens || 0} tokens
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!response && !loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💭</div>
                <p className="text-gray-400">
                  Configure your request and click "Send Request" to see the response here.
                </p>
              </div>
            )}
          </div>

          {/* Raw JSON Response */}
          {response && (
            <div className="glass-effect rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Raw Response</h3>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                  className="text-primary-400 hover:text-primary-300 text-sm"
                >
                  Copy JSON
                </button>
              </div>
              <SyntaxHighlighter
                language="json"
                style={tomorrow}
                className="text-xs rounded-lg max-h-96 overflow-y-auto"
              >
                {JSON.stringify(response, null, 2)}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Playground;