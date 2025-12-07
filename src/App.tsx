import { useState } from 'react';
import Navbar from './components/Navbar';
import AttendancePlan from './components/AttendancePlan';
import LaborScheduling from './components/LaborScheduling';
import EmployeeView from './components/EmployeeView';

function App() {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
      {activeTab !== 'employee' && (
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      
      <main>
        {activeTab === 'attendance' && <AttendancePlan />}
        {activeTab === 'assembly' && <LaborScheduling />}
        {activeTab === 'employee' && <EmployeeView onBack={() => setActiveTab('attendance')} />}
      </main>
    </div>
  );
}

export default App;
