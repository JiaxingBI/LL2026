import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Check, RotateCcw, RefreshCw } from 'lucide-react';
import { mockEmployees, mockAdjustments } from '../data/mockData';
import { Jia_ll_attendancesService } from '../generated/services/Jia_ll_attendancesService';
import type { Jia_ll_attendances } from '../generated/models/Jia_ll_attendancesModel';
import type { Employee, Adjustment, ShiftEntry } from '../types';
import AdjustmentTable from './AdjustmentTable';
import { useLanguage } from '../contexts/LanguageContext';

// Convert a Dataverse row into the Employee shape that the UI expects
function transformDataverseToEmployee(record: Jia_ll_attendances): Employee {
  const id = record.jia_title || '' as Employee['id'];
  const name = record.jia_field_1 || '' as Employee['name'];
  const role = (record.jia_field_2 || 'TC.L1') as Employee['role'];
  const indirectDirect = (record.jia_field_3 || 'Direct') as Employee['indirectDirect'];
  const status = (record.jia_field_4 || 'Prod.') as Employee['status'];
  const shiftTeam = (record.jia_field_5 || 'Green') as Employee['shiftTeam'];
  const gender = (record.jia_field_6 || 'Male') as Employee['gender'];

  // Deserialize shift-specific JSON (if it exists) into the shifts map
  const shifts: Record<string, ShiftEntry> = {};
  if (record.jia_field_5 && typeof record.jia_field_5 === 'string') {
    try {
      const parsedShifts = JSON.parse(record.jia_field_5);
      Object.assign(shifts, parsedShifts);
    } catch (e) {
      console.warn('Failed to parse shifts:', e);
    }
  }

  return {
    id,
    name,
    role,
    indirectDirect,
    status,
    shiftTeam,
    gender,
    shifts
  };
}

function dedupeEmployeesById(employees: Employee[]): Employee[] {
  const seen = new Set<string>();
  const unique: Employee[] = [];
  for (const emp of employees) {
    if (seen.has(emp.id)) continue;
    seen.add(emp.id);
    unique.push(emp);
  }
  return unique;
}

interface AttendancePlanProps {
  isInitialized?: boolean;
}

export default function AttendancePlan({ isInitialized = false }: AttendancePlanProps) {
  const { t } = useLanguage();

  // State describing the current UI experience (loading/error/source)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'dataverse' | 'mock'>('mock');
  
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(mockAdjustments);
  const [selectedShift, setSelectedShift] = useState('All');
  const [filterNearDates, setFilterNearDates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Track original Dataverse records for diffing on save
  const originalRecordsRef = useRef<Map<string, Jia_ll_attendances>>(new Map());
  
  // Saving state
  const [saving, setSaving] = useState(false);  
  
  // Track saved state - filter uses this, display uses 'employees' with pending changes
  const [savedEmployees, setSavedEmployees] = useState<Employee[]>(JSON.parse(JSON.stringify(mockEmployees)));
  const [savedAdjustments, setSavedAdjustments] = useState<Adjustment[]>(JSON.parse(JSON.stringify(mockAdjustments)));
  const [hasChanges, setHasChanges] = useState(false);

  // Queries Dataverse using the generated service, maps the rows, and chooses whether to show mock data.
  const loadFromDataverse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Jia_ll_attendancesService.getAll();
      if (!result.success) {
        setError(result.error?.message || 'Failed to load from Dataverse');
        setDataSource('mock');
        return;
      }

      if (!result.data) {
        setError('Dataverse returned no data');
        setDataSource('mock');
        return;
      }

      // Store original records for later diffing when saving
      originalRecordsRef.current.clear();
      result.data.forEach(rec => {
        const id = rec.jia_title || '';
        if (id) originalRecordsRef.current.set(id, rec);
      });
      
      const mapped = result.data.map(transformDataverseToEmployee);
      const dvEmployees = dedupeEmployeesById(mapped);
      console.log(`Retrieved ${result.data.length} records, showing ${dvEmployees.length} unique employees`);

      if (dvEmployees.length > 0) {
        setEmployees(dvEmployees);
        setSavedEmployees(JSON.parse(JSON.stringify(dvEmployees)));
        setDataSource('dataverse');
      } else {
        setDataSource('mock');
      }
    } catch (err: any) {
      console.error('Failed to retrieve attendance:', err);
      setError(err.message || 'Failed to connect to Dataverse');
      setDataSource('mock');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load from Dataverse when initialized
  useEffect(() => {
    if (isInitialized) {
      loadFromDataverse();
    }
  }, [isInitialized, loadFromDataverse]);

  // Debounce search input (300ms delay) for better performance
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save changes back to Dataverse (only modified records)
  const handleConfirm = useCallback(async () => {
    if (dataSource !== 'dataverse') {
      // Mock mode - just snapshot locally
      setSavedEmployees(JSON.parse(JSON.stringify(employees)));
      setSavedAdjustments(JSON.parse(JSON.stringify(adjustments)));
      setHasChanges(false);
      alert(t('attendance.changesSaved') || 'Changes saved successfully!');
      return;
    }

    setSaving(true);
    setError(null);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Find changed employees by comparing with saved snapshot
      for (const emp of employees) {
        const saved = savedEmployees.find(s => s.id === emp.id);
        if (!saved) continue;
        
        // Check if any field changed
        const fieldsChanged = 
          emp.name !== saved.name ||
          emp.role !== saved.role ||
          emp.indirectDirect !== saved.indirectDirect ||
          emp.status !== saved.status ||
          emp.shiftTeam !== saved.shiftTeam ||
          emp.gender !== saved.gender ||
          JSON.stringify(emp.shifts) !== JSON.stringify(saved.shifts);
        
        if (!fieldsChanged) continue;
        
        // Get the original Dataverse record to find the GUID
        const original = originalRecordsRef.current.get(emp.id);
        if (!original?.jia_ll_attendanceid) {
          console.warn(`No original record found for ${emp.id}, skipping`);
          continue;
        }
        
        // Build update payload
        const updatePayload: Partial<any> = {
          jia_title: emp.id,
          jia_field_1: emp.name,
          jia_field_2: emp.role,
          jia_field_3: emp.indirectDirect,
          jia_field_4: emp.status,
          jia_field_5: emp.shiftTeam,
          jia_field_6: emp.gender,
          // Could also save shifts as JSON if needed
        };
        
        try {
          await Jia_ll_attendancesService.update(original.jia_ll_attendanceid, updatePayload);
          successCount++;
        } catch (err) {
          console.error(`Failed to update ${emp.id}:`, err);
          errorCount++;
        }
      }
      
      // Update saved snapshot
      setSavedEmployees(JSON.parse(JSON.stringify(employees)));
      setSavedAdjustments(JSON.parse(JSON.stringify(adjustments)));
      setHasChanges(false);
      
      if (errorCount > 0) {
        alert(`Saved ${successCount} records, ${errorCount} failed.`);
      } else if (successCount > 0) {
        alert(`Successfully saved ${successCount} records!`);
      } else {
        alert(t('attendance.changesSaved') || 'No changes to save.');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [employees, savedEmployees, adjustments, dataSource, t]);

  // Revert all pending edits back to the last confirmed snapshot (reset button logic)
  const handleReset = useCallback(() => {
    setEmployees(JSON.parse(JSON.stringify(savedEmployees)));
    setAdjustments(JSON.parse(JSON.stringify(savedAdjustments)));
    setHasChanges(false);
  }, [savedEmployees, savedAdjustments]);

  // Generic helper for editing any top-level employee metadata (role/team/status dropdowns)
  const handleEmployeeUpdate = useCallback((empId: string, field: keyof Employee, value: string) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(e => {
        if (e.id === empId) {
          return { ...e, [field]: value };
        }
        return e;
      })
    );
    setHasChanges(true);
  }, []);

  // Handles typing into day/night cells, infers overtime/leave, and stages a change record
  const handleShiftChange = useCallback((emp: Employee, date: string, isNight: boolean, newValue: string) => {
    // Get the original value before the change
    const originalShift = emp.shifts[date];
    const originalValue = isNight ? (originalShift?.night || '') : (originalShift?.day || '');
    const originalHours = parseInt(originalValue) || 0;
    const newHours = parseInt(newValue) || 0;

    // Update the employee's shift data
    setEmployees(prevEmployees => 
      prevEmployees.map(e => {
        if (e.id === emp.id) {
          const newShifts = { ...e.shifts };
          if (!newShifts[date]) {
            newShifts[date] = { day: '', night: '' };
          }
          if (isNight) {
            newShifts[date] = { ...newShifts[date], night: newValue };
          } else {
            newShifts[date] = { ...newShifts[date], day: newValue };
          }
          return { ...e, shifts: newShifts };
        }
        return e;
      })
    );

    // Determine adjustment type:
    // - Overtime: Adding hours to a blank cell (originalHours = 0, newHours > 0)
    // - Leave: Reducing or clearing existing hours (originalHours > 0, newHours < originalHours)
    let adjustmentType: 'Overtime' | 'Leave' | null = null;
    let reason = '';

    if (originalHours === 0 && newHours > 0) {
      // Adding hours to blank = Overtime
      adjustmentType = 'Overtime';
      reason = 'Work Overtime';
    } else if (originalHours > 0 && newHours < originalHours) {
      // Reducing or clearing hours = Leave
      adjustmentType = 'Leave';
      reason = newHours === 0 ? 'Full Day Leave' : 'Partial Leave';
    } else if (originalHours > 0 && newHours > originalHours) {
      // Increasing existing hours = also Overtime
      adjustmentType = 'Overtime';
      reason = 'Extended Shift';
    }

    // Auto-add adjustment record if there's a meaningful change
    if (adjustmentType) {
      const year = new Date().getFullYear();
      const [month, day] = date.split('/').map(Number);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const newAdjustment: Adjustment = {
        id: Date.now().toString(),
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        indirectDirect: emp.indirectDirect,
        workStatus: emp.status,
        shiftTeam: emp.shiftTeam,
        gender: emp.gender,
        date: dateStr,
        isNight: isNight,
        originalHours: originalHours,
        hours: newHours,
        adjustmentType: adjustmentType,
        reason: reason,
        comments: ''
      };
      
      setAdjustments(prev => [...prev, newAdjustment]);
    }
    setHasChanges(true);
  }, []);

  // Build every calendar date used by the schedule grid (Jan 1 – Dec 31)
  const allDates = useMemo(() => {
    const year = new Date().getFullYear();
    const dates: string[] = [];
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dates.push(`${month + 1}/${day}`);
      }
    }
    return dates;
  }, []);

  // Optional date window filter; controlled by the near-dates toggle
  // When filterNearDates is ON: show ~14 days around today
  // When filterNearDates is OFF: show current month ± 1 month (~90 days) to prevent performance issues
  const filteredDates = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    
    let startDate: Date;
    let endDate: Date;
    
    if (filterNearDates) {
      // Near dates: 1 day before to 12 days after
      startDate = new Date(year, today.getMonth(), today.getDate() - 1);
      endDate = new Date(year, today.getMonth(), today.getDate() + 12);
    } else {
      // Extended view: current month ± 1 month (prevents browser crash from 730 columns)
      startDate = new Date(year, today.getMonth() - 1, 1);
      endDate = new Date(year, today.getMonth() + 2, 0); // Last day of next month
    }
    
    return allDates.filter(dateStr => {
      const [month, day] = dateStr.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return date >= startDate && date <= endDate;
    });
  }, [allDates, filterNearDates]);

  const dates = filteredDates;

  // Check if a date string matches today
  const isToday = (dateStr: string) => {
    const today = new Date();
    const [month, day] = dateStr.split('/').map(Number);
    return today.getMonth() + 1 === month && today.getDate() === day;
  };

  const filterKeys: Record<string, string> = {
    'All': 'filter.all',
    'Green': 'filter.green',
    'Blue': 'filter.blue',
    'Orange': 'filter.orange',
    'Yellow': 'filter.yellow'
  };

  // Apply filters directly to the displayed rows.
  // Uses debounced search for better performance when typing.
  const filteredEmployees = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    return employees.filter(emp => {
      if (selectedShift !== 'All' && emp.shiftTeam !== selectedShift) return false;
      if (query) {
        const nameMatches = emp.name.toLowerCase().includes(query);
        const idMatches = emp.id.toLowerCase().includes(query);
        if (!nameMatches && !idMatches) return false;
      }
      return true;
    });
  }, [employees, selectedShift, debouncedSearch]);

  const getShiftClass = (team: string) => {
    switch (team) {
      case 'Green': return 'badge-green';
      case 'Blue': return 'badge-blue';
      case 'Orange': return 'badge-orange';
      case 'Yellow': return 'badge-yellow';
      default: return '';
    }
  };

  const getRowBackgroundColor = (team: string) => {
    switch (team) {
      case 'Green': return '#e6f4ea';
      case 'Blue': return '#e3f2fd';
      case 'Orange': return '#fff3e0';
      case 'Yellow': return '#fffde7';
      default: return 'transparent';
    }
  };

  return (
    // Layout: header + toolbar + table + adjustment panel
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{t('attendance.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('attendance.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Data source indicator */}
          <span style={{ 
            fontSize: '12px', 
            padding: '4px 10px', 
            borderRadius: '12px',
            background: dataSource === 'dataverse' ? '#e8f5e9' : '#fff3e0',
            color: dataSource === 'dataverse' ? '#2e7d32' : '#e65100',
            fontWeight: 500
          }}>
            {dataSource === 'dataverse' ? '📊 Dataverse' : '📋 Mock Data'}
          </span>
          {/* Refresh button */}
          <button
            onClick={loadFromDataverse}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: '#f5f5f5',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#fef2f2', 
          borderRadius: '8px', 
          color: '#ef4444',
          fontSize: '14px',
          flexShrink: 0
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Schedule Editor */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div className='flex items-center gap-4'>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type='text' 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('attendance.search')} 
                className='input'
                style={{ paddingLeft: '36px', width: '250px' }}
              />
            </div>
            <div className='flex gap-2'>
              {['All', 'Green', 'Blue', 'Orange', 'Yellow'].map(filter => (
                <button 
                  key={filter} 
                  onClick={() => setSelectedShift(filter)}
                  className={`btn ${selectedShift === filter ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ 
                    fontSize: '14px', 
                    padding: '8px 20px',
                    backgroundColor: selectedShift === filter ? '#eff6ff' : 'transparent',
                    color: selectedShift === filter ? 'var(--accent-blue)' : 'inherit'
                  }}
                >
                  {t(filterKeys[filter])}
                </button>
              ))}
            </div>
            {/* Modern Toggle Switch */}
            <div 
              onClick={() => setFilterNearDates(!filterNearDates)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                background: filterNearDates ? '#eff6ff' : '#f5f5f5',
                border: `1px solid ${filterNearDates ? 'var(--accent-blue)' : '#e0e0e0'}`,
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: filterNearDates ? 'var(--accent-blue)' : '#ccc',
                position: 'relative',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: filterNearDates ? '22px' : '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: filterNearDates ? 'var(--accent-blue)' : '#666'
              }}>
                {t('attendance.nearDatesFilter')}
              </span>
            </div>
          </div>
          {/* Confirm and Reset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleReset}
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
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={16} />
              {t('attendance.reset') || 'Reset'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasChanges || saving}
              className='btn'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: hasChanges && !saving ? '#4caf50' : '#f5f5f5',
                color: hasChanges && !saving ? '#fff' : '#999',
                border: `1px solid ${hasChanges && !saving ? '#4caf50' : '#e0e0e0'}`,
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                opacity: hasChanges && !saving ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              {saving ? <RefreshCw size={16} className='animate-spin' /> : <Check size={16} />}
              {saving ? 'Saving...' : (t('attendance.confirm') || 'Confirm')}
            </button>
          </div>
        </div>

        <div className='table-container' style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '40px', minWidth: '40px', position: 'sticky', top: 0, left: 0, background: '#fafafa', zIndex: 5 }}>{t('attendance.id')}</th>
                <th style={{ width: '80px', minWidth: '80px', position: 'sticky', top: 0, left: '40px', background: '#fafafa', zIndex: 5 }}>{t('attendance.name')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '120px', background: '#fafafa', zIndex: 5 }}>{t('attendance.role')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '190px', background: '#fafafa', zIndex: 5 }}>{t('attendance.id_status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '260px', background: '#fafafa', zIndex: 5 }}>{t('attendance.status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '330px', background: '#fafafa', zIndex: 5 }}>{t('attendance.shift')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', top: 0, left: '400px', background: '#fafafa', zIndex: 5, boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>{t('attendance.gender')}</th>
                {dates.map(date => {
                  const todayHighlight = isToday(date);
                  const headerStyle = {
                    textAlign: 'center' as const,
                    minWidth: '60px',
                    borderLeft: '1px solid #eee',
                    position: 'sticky' as const,
                    top: 0,
                    background: '#fafafa',
                    zIndex: 4,
                    ...(todayHighlight && {
                      background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                    })
                  };
                  return (
                    <React.Fragment key={date}>
                      <th style={headerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                          <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.day')}</span>
                        </div>
                      </th>
                      <th style={headerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                          <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.night')}</span>
                        </div>
                      </th>
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, rowIndex) => {
                const rowBg = getRowBackgroundColor(emp.shiftTeam);
                return (
                <tr key={`${emp.id}-${rowIndex}`} style={{ backgroundColor: rowBg }}>
                  <td style={{ color: '#666', position: 'sticky', left: 0, background: rowBg, zIndex: 1, width: '40px', minWidth: '40px' }}>{emp.id}</td>
                  <td style={{ fontWeight: '500', position: 'sticky', left: '40px', background: rowBg, zIndex: 1, width: '80px', minWidth: '80px' }}>{emp.name}</td>
                  <td style={{ color: '#666', position: 'sticky', left: '120px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                    <select defaultValue={emp.role} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="TC.L1">TC.L1</option>
                      <option value="TC.L2">TC.L2</option>
                      <option value="TC.L3">TC.L3</option>
                      <option value="Hall Asist">Hall Asist</option>
                      <option value="Infeeder">Infeeder</option>
                      <option value="Sr.Infeeder">Sr.Infeeder</option>
                      <option value="Ops.L1">Ops.L1</option>
                    </select>
                  </td>
                  <td style={{ color: '#666', position: 'sticky', left: '190px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                    <select defaultValue={emp.indirectDirect} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="Direct">{t('id.direct')}</option>
                      <option value="Indirect">{t('id.indirect')}</option>
                    </select>
                  </td>
                  <td style={{ color: '#666', position: 'sticky', left: '260px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                    <select defaultValue={emp.status} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="Prod.">Prod.</option>
                      <option value="Jail">Jail</option>
                      <option value="DailyProduction">DailyProduction</option>
                    </select>
                  </td>
                  <td style={{ position: 'sticky', left: '330px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px' }}>
                    <select 
                      value={emp.shiftTeam} 
                      onChange={(e) => handleEmployeeUpdate(emp.id, 'shiftTeam', e.target.value)}
                      className={`badge ${getShiftClass(emp.shiftTeam)}`} 
                      style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Green">{t('filter.green')}</option>
                      <option value="Blue">{t('filter.blue')}</option>
                      <option value="Orange">{t('filter.orange')}</option>
                      <option value="Yellow">{t('filter.yellow')}</option>
                    </select>
                  </td>
                  <td style={{ color: '#666', position: 'sticky', left: '400px', background: rowBg, zIndex: 1, width: '70px', minWidth: '70px', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
                    <select defaultValue={emp.gender} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="Male">{t('gender.male')}</option>
                      <option value="Female">{t('gender.female')}</option>
                    </select>
                  </td>
                  {dates.map(date => (
                    <React.Fragment key={date}>
                      <td style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
                        <input 
                          type='text' 
                          defaultValue={emp.shifts[date]?.day || ''} 
                          onBlur={(e) => {
                            const originalValue = emp.shifts[date]?.day || '';
                            if (e.target.value !== originalValue) {
                              handleShiftChange(emp, date, false, e.target.value);
                            }
                          }}
                          style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
                        <input 
                          type='text' 
                          defaultValue={emp.shifts[date]?.night || ''} 
                          onBlur={(e) => {
                            const originalValue = emp.shifts[date]?.night || '';
                            if (e.target.value !== originalValue) {
                              handleShiftChange(emp, date, true, e.target.value);
                            }
                          }}
                          style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', outline: 'none' }}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Table shows auto-generated adjustments from shift edits */}
      <AdjustmentTable adjustments={adjustments} setAdjustments={setAdjustments} selectedShift={selectedShift} />
    </div>
  );
}
