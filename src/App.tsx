import { useState } from 'react';
import Navbar from './components/Navbar';
import AttendancePlan from './components/AttendancePlan';
import LaborScheduling from './components/LaborScheduling';
import EmployeeView from './components/EmployeeView';
import TestPage from './components/TestPage';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  // App is always initialized since PowerProvider handles SDK init
  const isInitialized = true;

  return (
    <LanguageProvider>
      <div style={{ width: '100%', minHeight: '100vh', height: '100%', background: 'var(--bg-color)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main style={{ flex: 1, width: '100%', overflow: 'auto' }}>
          {activeTab === 'attendance' && <AttendancePlan isInitialized={isInitialized} />}
          {activeTab === 'assembly' && <LaborScheduling />}
          {activeTab === 'employee' && <EmployeeView />}
          {activeTab === 'test' && <TestPage isInitialized={isInitialized} />}
        </main>
      </div>
    </LanguageProvider>
  );
}

export default App;
