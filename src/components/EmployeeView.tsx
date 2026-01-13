import { useState, useMemo } from 'react';
import { Search, X, Calendar, MapPin, Users, Clock, CheckCircle, Info, ChevronDown, MessageCircle, Loader2 } from 'lucide-react';
import { useDataverseEmployees } from '../hooks/useDataverseEmployees';
import type { Employee, AssemblyLine } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// Default assembly lines structure (these could also come from Dataverse in the future)
const defaultAssemblyLines: AssemblyLine[] = [
  { id: 'L1', name: 'L1 - Assembly Line 1', capacity: 8, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L2', name: 'L2 - Assembly Line 2', capacity: 10, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L3', name: 'L3 - Assembly Line 3', capacity: 6, currentWorkers: 0, assignedWorkers: [] },
  { id: 'L4', name: 'L4 - Assembly Line 4', capacity: 12, currentWorkers: 0, assignedWorkers: [] },
];

interface EmployeeViewProps {
  isInitialized?: boolean;
}

export default function EmployeeView({ isInitialized = true }: EmployeeViewProps) {
  const { t, language } = useLanguage();
  const { employees, isLoading, error } = useDataverseEmployees(isInitialized);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [lines] = useState<AssemblyLine[]>(defaultAssemblyLines);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<string | null>(null);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const employee = employees.find(emp => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      emp.id === searchQuery
    );
    
    if (employee) {
      setSelectedEmployee(employee);
      setHighlightedEmployeeId(employee.id);
      // Don't clear search query so user can see what they searched
    } else {
      alert(t('employee.notFound'));
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', background: '#F5F5F7' }}>
        <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading') || 'Loading employees from Dataverse...'}</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '24px', background: '#F5F5F7' }}>
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
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', height: '100%', background: '#F5F5F7' }}>
      {/* Top Header - Search Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employee.searchPlaceholder')} 
              className="input"
              style={{ 
                width: '100%', 
                paddingLeft: '42px', 
                paddingRight: '100px', 
                paddingTop: '10px', 
                paddingBottom: '10px', 
                fontSize: '14px', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ 
                position: 'absolute', 
                right: '4px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                padding: '6px 16px',
                fontSize: '13px'
              }}
            >
              {t('employee.search')}
            </button>
          </form>

          {/* Shift Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              style={{ 
                padding: '10px 36px 10px 12px', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                appearance: 'none',
                background: 'white',
                minWidth: '180px'
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
        </div>
      </div>

      {/* Main Content - Read-only Board */}
      <div className="container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Assembly Lines Grid - Read Only */}
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
                transition: 'border 0.15s, background 0.15s'
              }}
            >
              <div 
                className="flex justify-between" 
                style={{ alignItems: 'flex-start', marginBottom: '10px', position: 'relative' }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '13px', margin: 0, lineHeight: '1.3', color: '#1f2937' }}>{line.id}</h3>
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.3' }}>
                    {line.name.replace(`${line.id}-`, '').replace(`${line.id} - `, '')}
                  </p>
                </div>
                {line.comment && (
                  <MessageCircle 
                    size={14} 
                    style={{ 
                      flexShrink: 0,
                      color: 'var(--accent-blue)'
                    }} 
                  />
                )}
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
                      onClick={() => {
                        const emp = employees.find(e => e.id === worker.employeeId);
                        if (emp) {
                          setSelectedEmployee(emp);
                          setHighlightedEmployeeId(emp.id);
                        }
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 6px', 
                        background: highlightedEmployeeId === worker.employeeId ? '#dbeafe' : '#f9fafb', 
                        borderRadius: '4px', 
                        border: highlightedEmployeeId === worker.employeeId ? '1px solid #3b82f6' : '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background 0.15s, border 0.15s'
                      }}
                    >
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0 }}>
                        {worker.initials}
                      </div>
                      <span style={{ flex: 1, fontSize: '10px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Modal */}
      {selectedEmployee && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', overflow: 'hidden', padding: 0, animation: 'zoomIn 0.2s ease-out', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            {/* Modal Header */}
            <div style={{ padding: '28px 36px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#667eea', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', border: '3px solid rgba(255, 255, 255, 0.3)' }}>
                  {selectedEmployee.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>{selectedEmployee.name}</h2>
                  <div className="flex items-center gap-3" style={{ marginTop: '6px' }}>
                    <span style={{ padding: '4px 12px', background: 'rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '12px', fontWeight: 'bold', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', backdropFilter: 'blur(10px)' }}>{t('employee.active')}</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'monospace', fontWeight: '500' }}>ID: {selectedEmployee.id}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                style={{ padding: '8px', borderRadius: '50%', border: 'none', background: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={24} color="white" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Current Assignment */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#3b82f6" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.currentAssignment')}</span>
                </div>
                <div className="grid grid-cols-2" style={{ padding: '20px', gap: '24px' }}>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', margin: 0 }}>{t('employee.location')}</p>
                    <div className="flex items-center gap-2" style={{ color: '#111827', fontWeight: 'bold', fontSize: '18px' }}>
                      <MapPin size={20} color="#ef4444" />
                      P10B-SMP FULL FLEX NEW
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', margin: 0 }}>{t('employee.shift')}</p>
                    <div className="flex items-center gap-2" style={{ color: '#111827', fontWeight: 'bold', fontSize: '18px' }}>
                      <Clock size={20} color="#f97316" />
                      {t('employee.dayShift')}
                    </div>
                  </div>
                </div>
                <div style={{ margin: '0 20px 20px 20px', padding: '16px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px' }}>
                  <div className="flex items-start gap-3">
                    <Info size={20} color="#2563eb" style={{ marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{t('employee.specialInstructions')}</p>
                      <p style={{ fontSize: '14px', color: '#2563eb', marginTop: '4px', margin: 0 }}>{t('employee.instructionText')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-2">
                    <Users size={16} color="#a855f7" />
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.teamMembers')}</span>
                  </div>
                  <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#4b5563', padding: '2px 8px', borderRadius: '9999px', fontWeight: '500' }}>4 {t('employee.colleagues')}</span>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {['Ben', 'Eric', 'Frank', 'George'].map((name) => (
                    <div key={name} className="flex items-center gap-2" style={{ background: '#f9fafb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Schedule */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Calendar size={16} color="#f97316" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{t('employee.upcomingSchedule')}</span>
                </div>
                <div className="grid grid-cols-2" style={{ padding: '20px', gap: '16px' }}>
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '16px' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>{t('employee.tomorrow')}</span>
                      <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>SAT, DEC 6</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#4b5563' }}>
                      <CheckCircle size={16} color="#10b981" />
                      P10B-SMP FULL FLEX NEW
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px', margin: 0 }}>{t('employee.dayShift')}</p>
                  </div>
                  <div style={{ border: '1px solid #f3f4f6', borderRadius: '8px', padding: '16px' }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>{t('employee.dayAfter')}</span>
                      <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#4b5563', padding: '2px 6px', borderRadius: '4px' }}>SUN, DEC 7</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#4b5563' }}>
                      <CheckCircle size={16} color="#10b981" />
                      P30A - ASSEMBLY SUPPORT
                    </div>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginLeft: '24px', margin: 0 }}>{t('employee.nightShift')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 36px', background: 'linear-gradient(to top, #f9fafb 0%, white 100%)', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="btn"
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontWeight: 'bold', borderRadius: '12px', boxShadow: '0 10px 20px -5px rgba(102, 126, 234, 0.4)', fontSize: '15px', border: 'none', transition: 'all 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(102, 126, 234, 0.4)';
                }}
              >
                {t('employee.closeSchedule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
