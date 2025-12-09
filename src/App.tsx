import { useState } from 'react';
import Navbar from './components/Navbar';
import AttendancePlan from './components/AttendancePlan';
import LaborScheduling from './components/LaborScheduling';
import EmployeeView from './components/EmployeeView';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <LanguageProvider>
      <div style={{ width: '100%', minHeight: '100vh', height: '100%', background: 'var(--bg-color)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
        {activeTab !== 'employee' && (
          <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        
        <main style={{ flex: 1, width: '100%', overflow: 'auto' }}>
          {activeTab === 'attendance' && <AttendancePlan />}
          {activeTab === 'assembly' && <LaborScheduling />}
          {activeTab === 'employee' && <EmployeeView onBack={() => setActiveTab('attendance')} />}
        </main>
      </div>
    </LanguageProvider>
  );
}

export default App;
