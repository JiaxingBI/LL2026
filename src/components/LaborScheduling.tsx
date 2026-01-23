import { useState, useRef, useMemo } from 'react';
import { Users, Plus, MessageSquare, Trash2, ChevronDown, Search, X, MessageCircle, Loader2, RefreshCw } from 'lucide-react';
import { useDataverseEmployees } from '../hooks/useDataverseEmployees';
import type { AssemblyLine, Employee } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Default assembly lines structure
const defaultAssemblyLines: AssemblyLine[] = [
  { id: 'L1', name: 'L1 - Assembly Line 1', capacity: 8, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L2', name: 'L2 - Assembly Line 2', capacity: 10, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L3', name: 'L3 - Assembly Line 3', capacity: 6, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L4', name: 'L4 - Assembly Line 4', capacity: 12, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L5', name: 'L5 - Assembly Line 5', capacity: 8, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L6', name: 'L6 - Assembly Line 6', capacity: 10, currentWorkers: 0, assignedWorkers: [] },
];

interface LaborSchedulingProps {
  isInitialized?: boolean;
}

export default function LaborScheduling({ isInitialized = true }: LaborSchedulingProps) {
  const { t, language } = useLanguage();
  const { employees, isLoading, error, refetch } = useDataverseEmployees(isInitialized);
  
  const [lines, setLines] = useState<AssemblyLine[]>(defaultAssemblyLines);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [showAddWorkerDropdown, setShowAddWorkerDropdown] = useState(false);

  // Generate shift options for the next 7 days
  const shiftOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = language === 'zh' 
        ? `${date.getMonth() + 1}月${date.getDate()}日`
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayLabel = language === 'zh' ? '白班' : 'Day';
      const nightLabel = language === 'zh' ? '夜班' : 'Night';
      options.push(
        { value: `${date.toISOString().split('T')[0]}-day`, label: `${dateStr} - ${dayLabel}` },
        { value: `${date.toISOString().split('T')[0]}-night`, label: `${dateStr} - ${nightLabel}` }
      );
    }
    return options;
  }, [language]);

  // Set default shift to today's day shift
  useState(() => {
    if (!selectedShift && shiftOptions.length > 0) {
      setSelectedShift(shiftOptions[0].value);
    }
  });
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Filter employees based on selected date/shift - only show those with attendance
  const availableEmployees = useMemo(() => {
    if (!selectedShift) return employees;
    
    const [dateStr, shiftType] = selectedShift.split('-').length > 3 
      ? [selectedShift.substring(0, 10), selectedShift.substring(11)]
      : selectedShift.split('-').slice(0, 3).join('-').split('-').slice(0, 3).join('-') === selectedShift.substring(0, 10)
        ? [selectedShift.substring(0, 10), selectedShift.split('-').pop() || '']
        : ['', ''];
    
    // Parse the date to get month-day format for shifts lookup
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const shiftKey = `${month}/${day}`;
    const isNight = shiftType === 'night';
    
    return employees.filter(employee => {
      const shiftEntry = employee.shifts[shiftKey];
      if (!shiftEntry) return false;
      
      // Check if the employee has a numeric value (hours) for the selected shift
      const shiftValue = isNight ? shiftEntry.night : shiftEntry.day;
      const numValue = parseFloat(shiftValue);
      return !isNaN(numValue) && numValue > 0;
    });
  }, [selectedShift, employees]);
  
  // Drag and drop state
  const [draggedWorker, setDraggedWorker] = useState<{ employeeId: string; fromLineId: string; name: string; initials: string; experienceCount: number } | null>(null);
  const [dragOverLineId, setDragOverLineId] = useState<string | null>(null);
  
  // Comment tooltip state
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string>('');

  const handleAddWorkerClick = (lineId: string) => {
    const button = buttonRefs.current[lineId];
    if (button) {
      const rect = button.getBoundingClientRect();
      const dropdownHeight = 300; // max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Decide whether to open upward or downward based on available space
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownPosition({
        top: openUpward 
          ? rect.top + window.scrollY - dropdownHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280),
        openUpward
      });
    }
    setSelectedLineId(lineId);
    setWorkerSearchQuery('');
    setShowAddWorkerDropdown(true);
  };

  const handleSelectEmployee = (employee: Employee) => {
    if (!selectedLineId) return;
    
    // Check if worker is already assigned to ANY line
    const alreadyAssignedToAnyLine = lines.some(line => 
      line.assignedWorkers.some(w => w.employeeId === employee.id)
    );
    if (alreadyAssignedToAnyLine) return;
    
    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === selectedLineId) {
          return {
            ...line,
            currentWorkers: line.currentWorkers + 1,
            assignedWorkers: [
              ...line.assignedWorkers,
              {
                employeeId: employee.id,
                name: employee.name,
                initials: employee.name.split(' ').map(n => n[0]).join('').toUpperCase(),
                experienceCount: Math.floor(Math.random() * 50) + 1
              }
            ]
          };
        }
        return line;
      })
    );
    // Keep dropdown open - don't close after selection
  };

  const handleRemoveWorker = (lineId: string, employeeId: string) => {
    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            currentWorkers: Math.max(0, line.currentWorkers - 1),
            assignedWorkers: line.assignedWorkers.filter(w => w.employeeId !== employeeId)
          };
        }
        return line;
      })
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, worker: { employeeId: string; name: string; initials: string; experienceCount: number }, fromLineId: string) => {
    setDraggedWorker({ ...worker, fromLineId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, lineId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLineId(lineId);
  };

  const handleDragLeave = () => {
    setDragOverLineId(null);
  };

  const handleDrop = (e: React.DragEvent, toLineId: string) => {
    e.preventDefault();
    setDragOverLineId(null);
    
    if (!draggedWorker || draggedWorker.fromLineId === toLineId) {
      setDraggedWorker(null);
      return;
    }

    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === draggedWorker.fromLineId) {
          // Remove from source line
          return {
            ...line,
            currentWorkers: Math.max(0, line.currentWorkers - 1),
            assignedWorkers: line.assignedWorkers.filter(w => w.employeeId !== draggedWorker.employeeId)
          };
        }
        if (line.id === toLineId) {
          // Add to target line
          return {
            ...line,
            currentWorkers: line.currentWorkers + 1,
            assignedWorkers: [
              ...line.assignedWorkers,
              {
                employeeId: draggedWorker.employeeId,
                name: draggedWorker.name,
                initials: draggedWorker.initials,
                experienceCount: draggedWorker.experienceCount
              }
            ]
          };
        }
        return line;
      })
    );
    
    setDraggedWorker(null);
  };

  const handleDragEnd = () => {
    setDraggedWorker(null);
    setDragOverLineId(null);
  };

  const getShiftClass = (team: string) => {
    switch (team) {
      case 'Green': return 'badge-green';
      case 'Blue': return 'badge-blue';
      case 'Orange': return 'badge-orange';
      case 'Yellow': return 'badge-yellow';
      default: return '';
    }
  };

  const getCapacityColor = (current: number, capacity: number) => {
    if (current > capacity) return 'var(--danger)';
    if (current === capacity) return 'var(--success)';
    return 'var(--warning)';
  };

  const getCapacityText = (current: number, capacity: number) => {
    if (current > capacity) return 'var(--danger)';
    if (current === capacity) return 'var(--success)';
    return 'var(--warning)';
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading') || 'Loading employees from Dataverse...'}</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '24px' }}>
        <div style={{ color: '#d32f2f', fontSize: '18px', fontWeight: 500 }}>⚠️ {t('common.error') || 'Error loading data'}</div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', height: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{t('labor.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('labor.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3">
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.southRegion')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>2</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 11</span>
              </div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--warning)', marginTop: '4px' }}>• 9 {t('labor.needed')}</p>
            </div>
            <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px' }}>
              <Users size={20} color="var(--accent-blue)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.northRegion')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>1</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 4</span>
              </div>
              <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--warning)', marginTop: '4px' }}>• 3 {t('labor.needed')}</p>
            </div>
            <div style={{ padding: '8px', background: '#f3e8ff', borderRadius: '8px' }}>
              <Users size={20} color="#9333ea" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.totalWorkforce')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>3</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ 15</span>
              </div>
            </div>
            <Trash2 size={16} color="#d1d5db" style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '6px', marginTop: '16px' }}>
            <div style={{ background: 'var(--accent-blue)', height: '6px', borderRadius: '999px', width: '20%' }}></div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div className="flex items-center gap-2" style={{ position: 'relative' }}>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            style={{ 
              padding: '8px 36px 8px 12px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              fontSize: '14px',
              fontFamily: 'inherit',
              cursor: 'pointer',
              appearance: 'none',
              background: 'white',
              minWidth: '220px'
            }}
          >
            {shiftOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} />
        </div>
        <div className="flex" style={{ gap: '12px' }}>
          <button 
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'white',
              border: '1px solid #e5e7eb',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
            title={t('common.refresh') || 'Refresh data'}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            {t('common.refresh') || 'Refresh'}
          </button>
          <button className="btn btn-secondary">
            <MessageSquare size={16} />
            {t('labor.notifyTeam')}
          </button>
          <button className="btn btn-primary">
            <Plus size={16} />
            {t('labor.addLine')}
          </button>
        </div>
      </div>

      {/* Assembly Lines */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        width: '100%'
      }}>
        {lines.map((line) => (
          <div 
            key={line.id} 
            className="card" 
            style={{ 
              padding: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              border: dragOverLineId === line.id ? '2px solid var(--accent-blue)' : undefined,
              background: dragOverLineId === line.id ? '#f0f7ff' : undefined,
              transition: 'border 0.15s, background 0.15s',
              overflow: 'visible',
              position: 'relative'
            }}
            onDragOver={(e) => handleDragOver(e, line.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, line.id)}
          >
            <div 
              className="flex justify-between line-card-header" 
              style={{ alignItems: 'flex-start', marginBottom: '10px', position: 'relative' }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '13px', margin: 0, lineHeight: '1.3', color: '#1f2937' }}>{line.id}</h3>
                <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.3' }}>
                  {line.name.replace(`${line.id}-`, '').replace(`${line.id} - `, '')}
                </p>
              </div>
              <div 
                style={{ position: 'relative' }}
                onMouseEnter={() => !editingLineId && setHoveredLineId(line.id)}
                onMouseLeave={() => !editingLineId && setHoveredLineId(null)}
              >
                <MessageCircle 
                  size={14} 
                  style={{ 
                    cursor: 'pointer', 
                    flexShrink: 0,
                    color: line.comment ? 'var(--accent-blue)' : '#d1d5db',
                    transition: 'color 0.2s'
                  }} 
                  onClick={() => {
                    setEditingLineId(line.id);
                    setEditingComment(line.comment || '');
                    setHoveredLineId(null);
                  }}
                />
                {/* Hover Tooltip */}
                {hoveredLineId === line.id && !editingLineId && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    zIndex: 9999,
                    minWidth: '120px'
                  }}>
                    {line.comment || 'No comment. Click to add.'}
                  </div>
                )}
                {/* Edit Mode */}
                {editingLineId === line.id && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      padding: '8px',
                      background: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 9999,
                      minWidth: '180px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={editingComment}
                      onChange={(e) => setEditingComment(e.target.value)}
                      placeholder="Add a comment..."
                      autoFocus
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '6px 8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setEditingLineId(null);
                          setEditingComment('');
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          background: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setLines(prev => prev.map(l => 
                            l.id === line.id ? { ...l, comment: editingComment } : l
                          ));
                          setEditingLineId(null);
                          setEditingComment('');
                        }}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          border: 'none',
                          borderRadius: '4px',
                          background: 'var(--accent-blue)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div className="flex justify-between" style={{ fontSize: '10px', fontWeight: '500', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('labor.capacity')}</span>
                <span style={{ color: getCapacityText(line.currentWorkers, line.capacity) }}>
                  {line.currentWorkers} <span style={{ color: '#d1d5db' }}>/</span> {line.capacity}
                </span>
              </div>
              <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '4px' }}>
                <div 
                  style={{ 
                    height: '4px', 
                    borderRadius: '999px', 
                    transition: 'all 0.5s',
                    background: getCapacityColor(line.currentWorkers, line.capacity),
                    width: `${Math.min((line.currentWorkers / line.capacity) * 100, 100)}%` 
                  }} 
                ></div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {line.assignedWorkers.length === 0 ? (
                <div style={{ height: '40px', border: '2px dashed #f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <span style={{ fontSize: '10px' }}>{t('labor.noWorkers')}</span>
                </div>
              ) : (
                line.assignedWorkers.map((worker) => (
                  <div 
                    key={worker.employeeId} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, worker, line.id)}
                    onDragEnd={handleDragEnd}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 6px', 
                      background: draggedWorker?.employeeId === worker.employeeId ? '#e5e7eb' : '#f9fafb', 
                      borderRadius: '4px', 
                      border: '1px solid #f3f4f6',
                      cursor: 'grab',
                      opacity: draggedWorker?.employeeId === worker.employeeId ? 0.5 : 1,
                      transition: 'opacity 0.15s, background 0.15s'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0 }}>
                      {worker.initials}
                    </div>
                    <span style={{ flex: 1, fontSize: '10px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveWorker(line.id, worker.employeeId); }}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        transition: 'color 0.15s, background 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              ref={(el) => { buttonRefs.current[line.id] = el; }}
              onClick={() => handleAddWorkerClick(line.id)}
              className="btn btn-ghost" 
              style={{ marginTop: '10px', width: '100%', border: '1px dashed #d1d5db', justifyContent: 'center', color: 'var(--text-secondary)', padding: '6px 8px', fontSize: '11px' }}
            >
              <Plus size={12} />
              {t('labor.addWorker')}
            </button>
          </div>
        ))}
      </div>

      {/* Add Worker Dropdown */}
      {showAddWorkerDropdown && dropdownPosition && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setShowAddWorkerDropdown(false)}
          />
          <div 
            style={{ 
              position: 'absolute',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '300px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-color)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Search Bar */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  type="text"
                  value={workerSearchQuery}
                  onChange={(e) => setWorkerSearchQuery(e.target.value)}
                  placeholder={t('attendance.search')}
                  autoFocus
                  style={{ 
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            {/* Employee List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {(() => {
                // Get all assigned worker IDs across ALL lines (each person can only be assigned once)
                const allAssignedIds = lines.flatMap(line => line.assignedWorkers.map(w => w.employeeId));
                
                const filteredEmployees = availableEmployees
                  .filter(emp => !allAssignedIds.includes(emp.id)) // Exclude already assigned to any line
                  .filter(emp => 
                    emp.name.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
                    emp.id.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
                    emp.role.toLowerCase().includes(workerSearchQuery.toLowerCase())
                  );
                
                if (filteredEmployees.length === 0) {
                  return (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      {allAssignedIds.length > 0 && availableEmployees.filter(emp => !allAssignedIds.includes(emp.id)).length === 0
                        ? 'All employees are assigned'
                        : 'No employees found'}
                    </div>
                  );
                }
                
                return filteredEmployees.map((employee) => (
                  <div 
                    key={employee.id} 
                    onClick={() => handleSelectEmployee(employee)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '10px 12px', 
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: '#f9fafb', 
                      border: '1px solid #e5e7eb', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '11px', 
                      fontWeight: 'bold', 
                      color: '#4b5563',
                      flexShrink: 0
                    }}>
                      {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                        {employee.role}
                      </p>
                    </div>
                    <span className={`badge ${getShiftClass(employee.shiftTeam)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {employee.shiftTeam}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
