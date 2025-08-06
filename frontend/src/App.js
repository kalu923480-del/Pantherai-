import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import Models from './components/Models';
import Playground from './components/Playground';
import Analytics from './components/Analytics';
import { ApiService } from './services/api';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Overview', icon: '🏠' },
    { path: '/models', label: 'Models', icon: '🤖' },
    { path: '/playground', label: 'Playground', icon: '⚡' },
    { path: '/analytics', label: 'Analytics', icon: '📊' }
  ];

  return (
    <nav className="bg-dark-200 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-white mr-8">
              OpenRouter <span className="text-primary-500">Clone</span>
            </Link>
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-gray-300 hover:text-white hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              API Status: <span className="text-green-400">●</span> Healthy
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await ApiService.getStatus();
        setSystemStatus(status);
      } catch (error) {
        toast.error('Failed to connect to API');
        console.error('Status check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing OpenRouter Clone...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-dark-300">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard status={systemStatus} />} />
            <Route path="/models" element={<Models />} />
            <Route path="/playground" element={<Playground />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f8fafc',
              border: '1px solid #374151'
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;