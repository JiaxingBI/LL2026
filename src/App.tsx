import { useState, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { TableRowSkeleton } from './components/ui/Skeleton';
import { LanguageProvider } from './contexts/LanguageContext';

// AttendancePlan is the primary tab — loaded eagerly.
// Other tabs are lazy-loaded so the initial bundle stays small.
import AttendancePlan from './components/AttendancePlan';
const LaborScheduling = lazy(() => import('./components/LaborScheduling'));
const EmployeeView    = lazy(() => import('./components/EmployeeView'));
const TestPage        = lazy(() => import('./components/TestPage'));

function TabSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={8} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <LanguageProvider>
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          height: '100%',
          background: 'var(--bg-color)',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

        <main style={{ flex: 1, width: '100%', overflow: 'auto' }}>
          <ErrorBoundary>
            {activeTab === 'attendance' && (
              <AttendancePlan isInitialized={true} />
            )}
          </ErrorBoundary>

          <Suspense fallback={<TabSkeleton />}>
            <ErrorBoundary>
              {activeTab === 'assembly' && <LaborScheduling />}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeTab === 'employee' && <EmployeeView />}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeTab === 'test' && <TestPage isInitialized={true} />}
            </ErrorBoundary>
          </Suspense>
        </main>

        {/* Global toast notifications */}
        <ToastContainer />
      </div>
    </LanguageProvider>
  );
}

export default App;
