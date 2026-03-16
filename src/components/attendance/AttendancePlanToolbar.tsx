import { Check, RotateCcw, Search } from 'lucide-react';

interface AttendancePlanToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showShiftFilters: boolean;
  selectedShift: string;
  onSelectShift: (shift: string) => void;
  filterKeys: Record<string, string>;
  viewMode: 'pivot' | 'gallery';
  onViewModeChange: (viewMode: 'pivot' | 'gallery') => void;
  onReset: () => void;
  onConfirm: () => void;
  hasChanges: boolean;
  pendingChangeCount: number;
  t: (key: string) => string;
}

export function AttendancePlanToolbar({
  searchQuery,
  onSearchQueryChange,
  showShiftFilters,
  selectedShift,
  onSelectShift,
  filterKeys,
  viewMode,
  onViewModeChange,
  onReset,
  onConfirm,
  hasChanges,
  pendingChangeCount,
  t,
}: AttendancePlanToolbarProps) {
  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
      <div className='flex items-center gap-4'>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type='text'
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={t('attendance.search')}
            className='input'
            style={{ paddingLeft: '36px', width: '250px' }}
          />
        </div>
        {showShiftFilters && (
          <div className='flex gap-2'>
            {['All', 'Green', 'Blue', 'Orange', 'Yellow'].map(filter => (
              <button
                key={filter}
                onClick={() => onSelectShift(filter)}
                className={`btn ${selectedShift === filter ? 'btn-secondary' : 'btn-ghost'}`}
                style={{
                  fontSize: '14px',
                  padding: '8px 20px',
                  backgroundColor: selectedShift === filter ? '#eff6ff' : 'transparent',
                  color: selectedShift === filter ? 'var(--accent-blue)' : 'inherit',
                }}
              >
                {t(filterKeys[filter])}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className='nav-tabs' aria-label='Attendance view mode'>
          <button
            onClick={() => onViewModeChange('pivot')}
            className={`nav-tab ${viewMode === 'pivot' ? 'active' : ''}`}
            type='button'
          >
            {t('attendance.viewPivot')}
          </button>
          <button
            onClick={() => onViewModeChange('gallery')}
            className={`nav-tab ${viewMode === 'gallery' ? 'active' : ''}`}
            type='button'
          >
            {t('attendance.viewGallery')}
          </button>
        </div>
        <button
          onClick={onReset}
          disabled={!hasChanges}
          className='btn'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: hasChanges ? '#fff3e0' : '#f5f5f5',
            color: hasChanges ? '#e65100' : '#999',
            border: `1px solid ${hasChanges ? '#ffcc80' : '#e0e0e0'}`,
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.6,
            transition: 'all 0.2s ease',
          }}
        >
          <RotateCcw size={16} />
          {t('attendance.reset') || 'Reset'}
        </button>
        <button
          onClick={onConfirm}
          disabled={!hasChanges}
          className='btn'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: hasChanges ? '#4caf50' : '#f5f5f5',
            color: hasChanges ? '#fff' : '#999',
            border: `1px solid ${hasChanges ? '#4caf50' : '#e0e0e0'}`,
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            opacity: hasChanges ? 1 : 0.6,
            transition: 'all 0.2s ease',
          }}
        >
          <Check size={16} />
          {t('attendance.confirm') || 'Confirm'}
          {pendingChangeCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 18,
                height: 18,
                padding: '0 5px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.3)',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {pendingChangeCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}