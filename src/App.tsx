import { useState, useEffect } from 'react';
import { initialize } from '@microsoft/power-apps/app';
import Navbar from './components/Navbar';
import AttendancePlan from './components/AttendancePlan';
import LaborScheduling from './components/LaborScheduling';
import EmployeeView from './components/EmployeeView';
import TestPage from './components/TestPage';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Power Apps SDK
  useEffect(() => {
    const init = async () => {
      try {
        await initialize(); // Wait for SDK initialization
        setIsInitialized(true); // Mark the app as ready for data operations
      } catch (err) {
        console.error('Power Apps SDK initialization error:', err);
        setError('Failed to initialize Power Apps SDK');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Loading state
  if (loading) {
    return (
      <LanguageProvider>
        <div style={{ 
          width: '100%', 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--bg-color)',
          fontFamily: 'var(--font-sans)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #e5e7eb', 
              borderTopColor: 'var(--accent-blue)', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: 'var(--text-secondary)' }}>Initializing Power Apps SDK...</p>
          </div>
        </div>
      </LanguageProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <LanguageProvider>
        <div style={{ 
          width: '100%', 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--bg-color)',
          fontFamily: 'var(--font-sans)'
        }}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <div style={{ width: '100%', minHeight: '100vh', height: '100%', background: 'var(--bg-color)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main style={{ flex: 1, width: '100%', overflow: 'auto' }}>
          {activeTab === 'attendance' && <AttendancePlan />}
          {activeTab === 'assembly' && <LaborScheduling />}
          {activeTab === 'employee' && <EmployeeView />}
          {activeTab === 'test' && <TestPage isInitialized={isInitialized} />}
        </main>
      </div>
    </LanguageProvider>
  );
}

export default App;
