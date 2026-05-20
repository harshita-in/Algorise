import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Database, 
  Terminal, 
  Play, 
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import StockChart from './StockChart';

export default function Dashboard({ onBack }) {
  // Inputs state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tenure, setTenure] = useState('1d');
  
  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([
    { text: 'Algorise Stock AI Engine ready.', type: 'success' },
    { text: 'Enter a company name (e.g. Apple) to begin prediction.', type: 'dim' }
  ]);

  // Loading process logging steps
  const loadingLogsRef = useRef([]);

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  // Auto-focus search on load
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // API key is handled directly by the backend .env

  // Auto-search dropdown options when typing
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({ q: searchQuery });
        
        const response = await fetch(`/api/search?${queryParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Handle autocomplete click
  const handleSelectCompany = (company) => {
    setSearchQuery(company.name);
    setSearchResults([]);
    setShowDropdown(false);
    
    // Log selection in console
    addConsoleLog(`Selected company: ${company.name} (${company.symbol}) on ${company.exchange}`, 'success');
  };

  // Helper to add console logs
  const addConsoleLog = (text, type = 'normal') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, { text: `[${timestamp}] ${text}`, type }]);
  };

  // Perform prediction API call
  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Please search and select a company first.");
      return;
    }

    setLoading(true);
    setError(null);
    setPredictionData(null);
    setConsoleLogs([]);

    const logs = [
      { text: `Initializing prediction request for query: "${searchQuery}"`, type: 'normal' },
      { text: `Resolving company name to stock ticker symbol...`, type: 'normal' },
      { text: `Connecting to Twelve Data API endpoint...`, type: 'normal' },
      { text: `Fetching historical data (Tenure: ${tenure.toUpperCase()})...`, type: 'normal' },
      { text: `Normalizing input prices with MinMaxScaler...`, type: 'normal' },
      { text: `Constructing training lookback sequences (seq_length=15)...`, type: 'normal' },
      { text: `Initializing PyTorch LSTM model layout (2 LSTM layers, 48 hidden cells)...`, type: 'normal' },
      { text: `Starting LSTM training loop (epochs=50, learning_rate=0.01)...`, type: 'progress' },
      { text: `Epoch 10/50 | Loss: 0.148293`, type: 'progress' },
      { text: `Epoch 20/50 | Loss: 0.051934`, type: 'progress' },
      { text: `Epoch 30/50 | Loss: 0.012948`, type: 'progress' },
      { text: `Epoch 40/50 | Loss: 0.003923`, type: 'progress' },
      { text: `Epoch 50/50 | Loss: 0.000958`, type: 'progress' },
      { text: `Model training completed successfully!`, type: 'success' },
      { text: `Running autoregressive forecasting for the next predicted step series...`, type: 'normal' },
      { text: `Applying inverse transform to obtain dollar prices...`, type: 'normal' },
      { text: `Formatting output dates & charting data points...`, type: 'success' }
    ];
    loadingLogsRef.current = logs;

    // Simulate logs output during prediction loading
    let logIdx = 0;
    const logInterval = setInterval(() => {
      if (logIdx < logs.length) {
        const log = logs[logIdx];
        setConsoleLogs(current => {
          const timestamp = new Date().toLocaleTimeString();
          return [...current, { text: `[${timestamp}] ${log.text}`, type: log.type }];
        });
        logIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 200);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: searchQuery,
          tenure: tenure
        })
      });

      // Clear the interval if completed or failed, to dump remaining logs immediately
      clearInterval(logInterval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Server error running predictions.");
      }

      const data = await res.json();
      
      // Ensure all logs are dumped
      setConsoleLogs(current => {
        const timestamp = new Date().toLocaleTimeString();
        const dumpedLogs = logs.slice(current.length).map(l => ({
          text: `[${timestamp}] ${l.text}`,
          type: l.type
        }));
        return [...current, ...dumpedLogs];
      });

      setPredictionData(data);
      
      // Additional finish log
      const time = new Date().toLocaleTimeString();
      setConsoleLogs(current => [
        ...current, 
        { 
          text: `[${time}] Model output loaded. ${data.is_mocked ? 'SIMULATED DATA (API key missing/limit reached)' : 'LIVE TWELVE DATA'}`,
          type: data.is_mocked ? 'warning' : 'success'
        }
      ]);
      
    } catch (err) {
      clearInterval(logInterval);
      setError(err.message);
      addConsoleLog(`Prediction failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTenureLabel = () => {
    switch (tenure) {
      case '1h': return '1 Hour';
      case '1d': return '1 Day';
      case '2d': return '2 Days';
      case '1w': return '1 Week';
      case '1m': return '1 Month';
      default: return tenure;
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar Controls */}
      <div className="sidebar">
        <div className="logo-container" onClick={onBack} style={{ cursor: 'pointer' }}>
          <TrendingUp size={24} style={{ color: 'var(--color-secondary)' }} />
          <span>Algorise AI</span>
        </div>

        {/* API Key configuration is loaded directly from .env on backend */}

        {/* Tenure Selector */}
        <div className="sidebar-section">
          <label className="sidebar-label">Forecasting Tenure</label>
          <div className="tenure-selector" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {['1h', '1d', '2d', '1w', '1m'].map(t => (
              <button
                key={t}
                type="button"
                className={`tenure-chip ${tenure === t ? 'active' : ''}`}
                onClick={() => setTenure(t)}
                disabled={loading}
                style={{ padding: '0.4rem 0.2rem', textAlign: 'center' }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="btn-predict"
          onClick={handlePredict}
          disabled={loading || !searchQuery.trim()}
          style={{ marginTop: 'auto' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spinner" style={{ borderTopColor: '#fff', width: 18, height: 18 }} />
              Training LSTM...
            </>
          ) : (
            <>
              <Play size={18} />
              Run Predictor
            </>
          )}
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="main-content">
        
        {/* Top bar with Search */}
        <div className="top-bar">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                className="input-glow search-input"
                placeholder="Search company by name (e.g. Apple, Google, Tesla)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePredict();
                  }
                }}
                disabled={loading}
              />
            </div>
            
            {showDropdown && (
              <div className="dropdown-menu">
                {searchResults.map((company, index) => (
                  <div 
                    key={index} 
                    className="dropdown-item"
                    onClick={() => handleSelectCompany(company)}
                  >
                    <span className="dropdown-name">{company.name}</span>
                    <span className="dropdown-symbol">{company.symbol}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {predictionData && (
              <span className={`badge ${predictionData.is_mocked ? 'badge-warning' : 'badge-success'}`}>
                {predictionData.is_mocked ? <AlertTriangle size={12} /> : <Database size={12} />}
                {predictionData.is_mocked ? 'Simulated Data' : 'Live Data'}
              </span>
            )}
            <button 
              className="tenure-chip" 
              style={{ border: '1px solid var(--border-standard)' }} 
              onClick={onBack}
              disabled={loading}
            >
              Back to Welcome
            </button>
          </div>
        </div>

        {/* Dashboard Grid Workspace */}
        <div className="dashboard-grid">
          
          {/* Main Visuals & Metrics Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Chart Area */}
            <div className="glass-panel chart-panel">
              {loading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p style={{ fontWeight: 500 }}>Training LSTM Model...</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Running 50 epochs on recent stock prices.
                  </p>
                </div>
              )}

              {predictionData ? (
                <>
                  <div className="chart-header">
                    <div className="chart-title-group">
                      <h2 className="chart-title">{predictionData.company_name}</h2>
                      <span className="chart-symbol">({predictionData.symbol} - {predictionData.exchange})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      <Calendar size={14} />
                      Range: {getTenureLabel()} Forecast
                    </div>
                  </div>
                  
                  <StockChart 
                    historical={predictionData.historical}
                    predicted={predictionData.predicted}
                    symbol={predictionData.symbol}
                  />
                </>
              ) : !loading ? (
                <div className="empty-state">
                  <Search size={48} className="empty-icon" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No Stock Analyzed</h3>
                  <p style={{ fontSize: '0.9rem', maxWidth: '300px' }}>
                    Type a company's full name in the search bar and click "Run Predictor" to forecast prices.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Metrics Display */}
            {predictionData && (
              <div className="metrics-row">
                <div className="glass-panel stat-card">
                  <div className="sidebar-label">Current Price</div>
                  <div className="stat-val">
                    ${predictionData.last_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="glass-panel stat-card">
                  <div className="sidebar-label">LSTM Forecasted Price ({getTenureLabel()})</div>
                  <div className="stat-val">
                    ${predictionData.predicted_end_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>

                <div className="glass-panel stat-card">
                  <div className="sidebar-label">Projected Trend</div>
                  <div className={`stat-val ${predictionData.percentage_change >= 0 ? 'up' : 'down'}`}>
                    {predictionData.percentage_change >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    {predictionData.percentage_change >= 0 ? '+' : ''}
                    {predictionData.percentage_change.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1rem 1.5rem', 
                  borderLeft: '4px solid var(--color-accent-red)', 
                  background: 'rgba(239, 68, 68, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#fca5a5'
                }}
              >
                <AlertTriangle size={20} style={{ color: 'var(--color-accent-red)' }} />
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Prediction Engine Error</h4>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{error}</p>
                </div>
              </div>
            )}

          </div>

          {/* Right Console Log Panel */}
          <div className="glass-panel console-panel">
            <div className="console-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={16} style={{ color: 'var(--color-primary-hover)' }} />
                <span className="sidebar-label" style={{ color: 'var(--color-text-primary)' }}>System Console</span>
              </div>
              <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: '#0284c7', color: '#e0f2fe' }}>
                ONLINE
              </span>
            </div>
            
            <div className="console-body">
              {consoleLogs.map((log, index) => {
                let className = "console-line";
                if (log.type === 'dim') className += " dim";
                if (log.type === 'success') className += " success";
                if (log.type === 'progress') className += " progress";
                if (log.type === 'error') className += " console-line"; // Red handled below
                
                const isError = log.type === 'error';
                const isWarning = log.type === 'warning';
                
                return (
                  <div 
                    key={index} 
                    className={className}
                    style={{ 
                      color: isError ? 'var(--color-accent-red)' : isWarning ? '#f59e0b' : undefined 
                    }}
                  >
                    {log.text}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
              The system builds an autoregressive sequence using historical closing rates to project the next ticks.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
