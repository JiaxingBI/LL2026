import { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { mockEmployees, mockAdjustments } from '../data/mockData';
import type { Employee, Adjustment } from '../types';
import AdjustmentTable from './AdjustmentTable';
import { useLanguage } from '../contexts/LanguageContext';

export default function AttendancePlan() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(mockAdjustments);
  const [selectedShift, setSelectedShift] = useState('All');
  const [filterNearDates, setFilterNearDates] = useState(true);

  // Function to handle shift value changes and auto-add to adjustment table
  const handleShiftChange = useCallback((emp: Employee, date: string, isNight: boolean, newValue: string) => {
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

    // Auto-add adjustment record if value changed
    if (newValue) {
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
        hours: parseInt(newValue) || 12,
        reason: 'Overtime',
        comments: ''
      };
      
      setAdjustments(prev => [...prev, newAdjustment]);
    }
  }, []);

  // Generate all dates for the year (1/1 to 12/31)
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

  // Filter dates: today - 4 to today + 12
  const filteredDates = useMemo(() => {
    if (!filterNearDates) return allDates;
    
    const today = new Date();
    const year = today.getFullYear();
    
    const startDate = new Date(year, today.getMonth(), today.getDate() - 4);
    const endDate = new Date(year, today.getMonth(), today.getDate() + 12);
    
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

  const filteredEmployees = selectedShift === 'All' 
    ? employees 
    : employees.filter(emp => emp.shiftTeam === selectedShift);

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
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{t('attendance.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('attendance.subtitle')}</p>
      </div>

      {/* Schedule Editor */}
      <div className='card' style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div className='flex items-center gap-4'>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type='text' 
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
        </div>

        <div className='table-container' style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '40px', minWidth: '40px', position: 'sticky', left: 0, background: '#fafafa', zIndex: 2 }}>{t('attendance.id')}</th>
                <th style={{ width: '80px', minWidth: '80px', position: 'sticky', left: '40px', background: '#fafafa', zIndex: 2 }}>{t('attendance.name')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '120px', background: '#fafafa', zIndex: 2 }}>{t('attendance.role')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '190px', background: '#fafafa', zIndex: 2 }}>{t('attendance.id_status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '260px', background: '#fafafa', zIndex: 2 }}>{t('attendance.status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '330px', background: '#fafafa', zIndex: 2 }}>{t('attendance.shift')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '400px', background: '#fafafa', zIndex: 2, boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>{t('attendance.gender')}</th>
                {dates.map(date => {
                  const todayHighlight = isToday(date);
                  const headerStyle = {
                    textAlign: 'center' as const,
                    minWidth: '60px',
                    borderLeft: '1px solid #eee',
                    ...(todayHighlight && {
                      background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
                    })
                  };
                  return (
                    <>
                      <th key={`${date}-day`} style={headerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                          <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.day')}</span>
                        </div>
                      </th>
                      <th key={`${date}-night`} style={headerStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontWeight: todayHighlight ? 'bold' : 'normal' }}>{date}</span>
                          <span style={{ fontSize: '10px', color: todayHighlight ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>{t('attendance.night')}</span>
                        </div>
                      </th>
                    </>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const rowBg = getRowBackgroundColor(emp.shiftTeam);
                return (
                <tr key={emp.id} style={{ backgroundColor: rowBg }}>
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
                    <select defaultValue={emp.shiftTeam} className={`badge ${getShiftClass(emp.shiftTeam)}`} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}>
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
                    <>
                      <td key={`${date}-day`} style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
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
                      <td key={`${date}-night`} style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
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
                    </>
                  ))}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Table */}
      <AdjustmentTable adjustments={adjustments} setAdjustments={setAdjustments} selectedShift={selectedShift} />
    </div>
  );
}
