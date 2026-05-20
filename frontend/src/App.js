import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'dashboard'

  return (
    <div className="app-container">
      {view === 'landing' ? (
        <LandingPage onGetStarted={() => setView('dashboard')} />
      ) : (
        <Dashboard onBack={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
