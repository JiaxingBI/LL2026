import { useEffect } from 'react';

interface TestPageProps {
  isInitialized?: boolean;
}

export default function TestPage({ isInitialized = false }: TestPageProps) {
  useEffect(() => {
    // Intentionally empty: SharePoint connection removed.
    void isInitialized;
  }, [isInitialized]);

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px' }}>Connections Test</h1>
      <p style={{ color: '#6b7280', marginTop: '12px' }}>
        SharePoint connections were removed from this app.
      </p>
    </div>
  );
}
