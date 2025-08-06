import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API_KEY = process.env.REACT_APP_API_KEY || 'user-key-demo';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const ApiService = {
  // Chat completions
  async createChatCompletion(request) {
    const response = await api.post('/v1/chat/completions', request);
    return response.data;
  },

  // Models
  async getModels() {
    const response = await api.get('/v1/models');
    return response.data;
  },

  // System status
  async getStatus() {
    const response = await api.get('/v1/status');
    return response.data;
  },

  // Admin endpoints
  async getUsageDetails() {
    const response = await api.get('/admin/usage');
    return response.data;
  },

  async getApiKeysStatus() {
    const response = await api.get('/admin/keys');
    return response.data;
  },

  // Health check
  async healthCheck() {
    const response = await api.get('/');
    return response.data;
  }
};