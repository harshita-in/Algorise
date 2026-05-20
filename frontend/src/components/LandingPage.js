import React from 'react';
import { Cpu, Activity, Zap, TrendingUp, ChevronRight } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page animate-fade-in">
      {/* Decorative Glow Elements */}
      <div className="bg-glow-radial" style={{ top: '-10%', left: '20%' }}></div>
      <div className="bg-glow-radial" style={{ bottom: '-10%', right: '10%' }}></div>

      <div style={{ zIndex: 1, maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          className="feature-icon-wrapper" 
          style={{ width: '60px', height: '60px', borderRadius: '16px', marginBottom: '2rem' }}
        >
          <Cpu size={32} />
        </div>
        
        <h1 className="landing-title">
          Algorise Stock AI
        </h1>
        
        <p className="landing-subtitle">
          Deep learning time series forecasting. Train a PyTorch Long Short-Term Memory (LSTM) recurrent neural network on the fly to predict stock prices instantly.
        </p>
        
        <button className="btn-glow" onClick={onGetStarted}>
          Get Started <ChevronRight size={18} />
        </button>
      </div>

      {/* Feature Grid */}
      <div className="features-grid">
        <div className="glass-panel feature-card">
          <div className="feature-icon-wrapper">
            <TrendingUp size={22} />
          </div>
          <h3 className="feature-title">LSTM Engine</h3>
          <p className="feature-desc">
            Utilizes custom 2-layer Long Short-Term Memory neural networks. Models temporal dependencies to project stock price trends.
          </p>
        </div>

        <div className="glass-panel feature-card">
          <div className="feature-icon-wrapper">
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Flexible Tenures</h3>
          <p className="feature-desc">
            Forecast ranges adapted to your view: choose between 1 hour, 1 day, 2 days, 1 week, or 1 month windows.
          </p>
        </div>

        <div className="glass-panel feature-card">
          <div className="feature-icon-wrapper">
            <Activity size={22} />
          </div>
          <h3 className="feature-title">Twelve Data Live</h3>
          <p className="feature-desc">
            Integrates with Twelve Data API for real-time rates. Features intelligent, robust simulation fallback when rate limits are exceeded.
          </p>
        </div>
      </div>
    </div>
  );
}
