import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { mockEmployees, mockAdjustments } from '../data/mockData';
import type { Employee, Adjustment } from '../types';
import AdjustmentTable from './AdjustmentTable';
import { useLanguage } from '../contexts/LanguageContext';

export default function AttendancePlan() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(mockAdjustments);
  const [selectedShift, setSelectedShift] = useState('All');

  const dates = ['12/5', '12/6', '12/7', '12/8', '12/9', '12/10', '12/11', '12/12'];

  const filterKeys: Record<string, string> = {
    'All': 'filter.all',
    'Green': 'filter.green',
    'Blue': 'filter.blue',
    'Orange': 'filter.orange',
    'Yellow': 'filter.yellow'
  };

  const handleAutoAssign = () => {
    const newEmployees = employees.map(emp => emp);
    setEmployees(newEmployees);
    alert(t('attendance.autoAssignComplete'));
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
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{t('attendance.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('attendance.subtitle')}</p>
      </div>

      {/* Schedule Editor */}
      <div className='card'>
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
          </div>
          <button 
            onClick={handleAutoAssign}
            className='btn btn-secondary'
            style={{ color: 'var(--accent-blue)', background: '#eff6ff', border: 'none' }}
          >
            <RefreshCw size={16} />
            {t('attendance.autoAssign')}
          </button>
        </div>

        <div className='table-container'>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>{t('attendance.id')}</th>
                <th style={{ width: '150px' }}>{t('attendance.name')}</th>
                <th style={{ width: '100px' }}>{t('attendance.role')}</th>
                <th style={{ width: '100px' }}>{t('attendance.id_status')}</th>
                <th style={{ width: '100px' }}>{t('attendance.status')}</th>
                <th style={{ width: '100px' }}>{t('attendance.shift')}</th>
                <th style={{ width: '80px' }}>{t('attendance.gender')}</th>
                {dates.map(date => (
                  <>
                    <th key={`${date}-day`} style={{ textAlign: 'center', minWidth: '60px', borderLeft: '1px solid #eee' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{date}</span>
                        <span style={{ fontSize: '10px', color: '#999', fontWeight: 'normal' }}>{t('attendance.day')}</span>
                      </div>
                    </th>
                    <th key={`${date}-night`} style={{ textAlign: 'center', minWidth: '60px', borderLeft: '1px solid #eee' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{date}</span>
                        <span style={{ fontSize: '10px', color: '#999', fontWeight: 'normal' }}>{t('attendance.night')}</span>
                      </div>
                    </th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} style={{ backgroundColor: getRowBackgroundColor(emp.shiftTeam) }}>
                  <td style={{ color: '#666' }}>{emp.id}</td>
                  <td style={{ fontWeight: '500' }}>{emp.name}</td>
                  <td style={{ color: '#666' }}>
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
                  <td style={{ color: '#666' }}>
                    <select defaultValue={emp.indirectDirect} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="Direct">{t('id.direct')}</option>
                      <option value="Indirect">{t('id.indirect')}</option>
                    </select>
                  </td>
                  <td style={{ color: '#666' }}>
                    <select defaultValue={emp.status} style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}>
                      <option value="Prod.">Prod.</option>
                      <option value="Jail">Jail</option>
                      <option value="DailyProduction">DailyProduction</option>
                    </select>
                  </td>
                  <td>
                    <select defaultValue={emp.shiftTeam} className={`badge ${getShiftClass(emp.shiftTeam)}`} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}>
                      <option value="Green">{t('filter.green')}</option>
                      <option value="Blue">{t('filter.blue')}</option>
                      <option value="Orange">{t('filter.orange')}</option>
                      <option value="Yellow">{t('filter.yellow')}</option>
                    </select>
                  </td>
                  <td style={{ color: '#666' }}>
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
                          style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', outline: 'none' }}
                        />
                      </td>
                      <td key={`${date}-night`} style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
                        <input 
                          type='text' 
                          defaultValue={emp.shifts[date]?.night || ''} 
                          style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', outline: 'none' }}
                        />
                      </td>
                    </>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Table */}
      <AdjustmentTable adjustments={adjustments} setAdjustments={setAdjustments} />
    </div>
  );
}
