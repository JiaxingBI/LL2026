import { useState, useMemo, useEffect } from 'react';
import { Search, X, Calendar, MapPin, Users, Clock, CheckCircle, Info, MessageCircle, RefreshCw, AlertCircle, CalendarDays, UserCheck, ClipboardList } from 'lucide-react';
import { useDataverseEmployees } from '../hooks/useDataverseEmployees';
import type { Employee, AssemblyLine } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_ASSEMBLY_LINES } from '../constants/assemblyLines';
import { CardSkeleton } from './ui/Skeleton';
import CustomSelect from './ui/CustomSelect';
import { renderShiftSelectOption, renderShiftSelectValue } from '../utils/shiftSelectRenderers';
import PageHero from './ui/PageHero';

// Default assembly lines — shared with LaborScheduling
const defaultAssemblyLines: AssemblyLine[] = DEFAULT_ASSEMBLY_LINES.slice(0, 4);

interface EmployeeViewProps {
  isInitialized?: boolean;
}

function getUtc8Now(): Date {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMillis + 8 * 60 * 60_000);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function EmployeeView({ isInitialized = true }: EmployeeViewProps) {
  const { t, language } = useLanguage();
  const { employees, isLoading, error, refetch } = useDataverseEmployees(isInitialized);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [lines] = useState<AssemblyLine[]>(defaultAssemblyLines);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Generate shift options for the next 7 days
  const shiftOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const today = getUtc8Now();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const isoDate = toIsoDate(date);
      const dateStr = language === 'zh' 
        ? `${date.getMonth() + 1}月${date.getDate()}日`
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayLabel = language === 'zh' ? '白班' : 'Day';
      const nightLabel = language === 'zh' ? '夜班' : 'Night';
      options.push(
        { value: `${isoDate}-day`, label: `${dateStr} - ${dayLabel}` },
        { value: `${isoDate}-night`, label: `${dateStr} - ${nightLabel}` }
      );
    }
    return options;
  }, [language]);

  useEffect(() => {
    if (!selectedShift && shiftOptions.length > 0) {
      setSelectedShift(shiftOptions[0].value);
    }
  }, [selectedShift, shiftOptions]);

  const totalCapacity = useMemo(() => lines.reduce((sum, line) => sum + line.capacity, 0), [lines]);
  const totalAssignedWorkers = useMemo(() => lines.reduce((sum, line) => sum + line.currentWorkers, 0), [lines]);
  const highlightedEmployee = useMemo(() => employees.find(employee => employee.id === highlightedEmployeeId) ?? null, [employees, highlightedEmployeeId]);
  const linesWithComments = useMemo(() => lines.filter(line => Boolean(line.comment)).length, [lines]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const employee = employees.find(emp =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id === searchQuery
    );

    if (employee) {
      setSelectedEmployee(employee);
      setHighlightedEmployeeId(employee.id);
    } else {
      setSearchError(t('employee.notFound') || 'Employee not found. Try a different name or ID.');
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

  // Loading state — skeleton cards instead of blocking spinner
  if (isLoading) {
    return (
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
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
    <div className="container" style={{ position: 'relative', width: '100%', minHeight: '100vh', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHero
        title={t('employee.title')}
        subtitle={t('employee.subtitle')}
        aside={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(210,210,215,0.8)' }}>
            <CalendarDays size={18} color="var(--accent-blue)" />
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('labor.selectDateShift')}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {shiftOptions.find(option => option.value === selectedShift)?.label ?? t('labor.selectDate')}
              </div>
            </div>
          </div>
        )}
      />

      <div className="grid grid-cols-3" style={{ gap: 14 }}>
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.assignedWorkers')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>{totalAssignedWorkers}</span>
                <span style={{ fontSize: '14px', color: '#999' }}>/ {totalCapacity}</span>
              </div>
            </div>
            <div style={{ padding: '8px', background: '#eefbf3', borderRadius: '8px' }}>
              <UserCheck size={20} color="var(--success)" />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('employee.teamMembers')}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold' }}>{lines.length}</span>
                <span style={{ fontSize: '14px', color: '#999' }}>{t('employee.colleagues')}</span>
              </div>
            </div>
            <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px' }}>
              <Users size={20} color="var(--accent-blue)" />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>{t('employee.currentAssignment')}</p>
              <div style={{ marginTop: '8px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {highlightedEmployee?.name || 'No employee selected'}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4, marginBottom: 0 }}>
                {linesWithComments} commented lines in view
              </p>
            </div>
            <div style={{ padding: '8px', background: '#f5f3ff', borderRadius: '8px' }}>
              <ClipboardList size={20} color="#6366f1" />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
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
                border: searchError ? '1px solid var(--danger)' : '1px solid #e5e7eb',
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
                fontSize: '13px',
              }}
            >
              {t('employee.search')}
            </button>
          </form>
          {searchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontSize: 13, flexShrink: 0 }}>
              <AlertCircle size={15} />
              {searchError}
            </div>
          )}

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
            title={t('common.refresh') || 'Refresh data'}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            {t('common.refresh') || 'Refresh'}
          </button>

          <CustomSelect
            standalone
            value={selectedShift}
            onChange={(v) => setSelectedShift(v)}
            options={shiftOptions}
            minWidth="180px"
            renderValue={renderShiftSelectValue}
            renderOption={renderShiftSelectOption}
          />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '12px',
        width: '100%'
      }}>
          {lines.map((line) => (
            <div 
              key={line.id} 
              className="card" 
              style={{ 
                padding: '16px', 
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0, lineHeight: '1.3', color: '#1f2937' }}>{line.id}</h3>
                    <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(219, 234, 254, 0.8)', color: '#1d4ed8', fontSize: 11, fontWeight: 700 }}>
                      {line.capacity - line.currentWorkers > 0 ? `${line.capacity - line.currentWorkers} open` : 'Full'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
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
                <div className="flex justify-between" style={{ fontSize: '11px', fontWeight: '600', marginBottom: '6px' }}>
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
                  <div style={{ minHeight: '78px', border: '2px dashed #e5e7eb', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: '#fafafa', padding: '12px' }}>
                    <span style={{ fontSize: '12px', textAlign: 'center' }}>{t('labor.noWorkers')}</span>
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
                        gap: '8px', 
                        padding: '8px 10px', 
                        background: highlightedEmployeeId === worker.employeeId ? '#dbeafe' : '#f9fafb', 
                        borderRadius: '12px', 
                        border: highlightedEmployeeId === worker.employeeId ? '1px solid #3b82f6' : '1px solid #eef2f7',
                        cursor: 'pointer',
                        transition: 'background 0.15s, border 0.15s'
                      }}
                    >
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0 }}>
                        {worker.initials}
                      </div>
                      <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
      </div>

      {selectedEmployee && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15, 23, 42, 0.44)', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '840px', overflow: 'hidden', padding: 0, animation: 'worker-modal-in 0.2s ease-out', boxShadow: '0 32px 90px rgba(15, 23, 42, 0.24)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.45)' }}>
            <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%)' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#1d4ed8', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.18)' }}>
                  {selectedEmployee.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{selectedEmployee.name}</h2>
                  <div className="flex items-center gap-3" style={{ marginTop: '6px' }}>
                    <span style={{ padding: '4px 12px', background: 'rgba(219, 234, 254, 0.9)', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', borderRadius: '999px' }}>{t('employee.active')}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: '500' }}>ID: {selectedEmployee.id}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                style={{ width: 40, height: 40, padding: 0, borderRadius: '999px', border: '1px solid rgba(148, 163, 184, 0.2)', background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <X size={20} color="var(--text-primary)" />
              </button>
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#3b82f6" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>{t('employee.currentAssignment')}</span>
                </div>
                <div className="grid grid-cols-2" style={{ padding: '20px', gap: '24px' }}>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px', margin: 0 }}>{t('employee.location')}</p>
                    <div className="flex items-center gap-2" style={{ color: '#111827', fontWeight: 'bold', fontSize: '18px' }}>
                      <MapPin size={20} color="#ef4444" />
                      P10B-SMP FULL FLEX NEW
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', marginBottom: '4px', margin: 0 }}>{t('employee.shift')}</p>
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

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="flex items-center gap-2">
                    <Users size={16} color="var(--accent-blue)" />
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>{t('employee.teamMembers')}</span>
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

              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '4px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="#f97316" />
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>{t('employee.upcomingSchedule')}</span>
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

            <div style={{ padding: '20px 32px', background: 'linear-gradient(to top, #f9fafb 0%, white 100%)', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontWeight: 'bold', borderRadius: '14px', fontSize: '15px', justifyContent: 'center' }}
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
