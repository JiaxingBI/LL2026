import { useState, useEffect } from 'react';
import { SharePointService } from '../generated';
import { RefreshCw } from 'lucide-react';

const SP_SITE_URL = 'https://legogroup.sharepoint.com/sites/JIABISolution';
const SP_LIST_NAME = 'LL_attendance';

interface TestPageProps {
  isInitialized?: boolean;
}

export default function TestPage({ isInitialized = false }: TestPageProps) {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await SharePointService.GetItems(SP_SITE_URL, SP_LIST_NAME);
      if (result.data?.value) {
        const mapped = result.data.value.map((item: any) => item.dynamicProperties || item);
        setItems(mapped);
      } else {
        setItems([]);
        if (!result.success && result.error) {
          setError(result.error.message || 'Failed to load items');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) loadItems();
  }, [isInitialized]);

  // Get all unique keys from items for table columns
  const columns = items.length > 0 
    ? [...new Set(items.flatMap(item => Object.keys(item)))]
    : [];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>SharePoint List: {SP_LIST_NAME}</h1>
        <button
          onClick={loadItems}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p style={{ color: '#6b7280' }}>No items found</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {columns.map(col => (
                  <th key={col} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {columns.map(col => (
                    <td key={col} style={{ padding: '10px 12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
