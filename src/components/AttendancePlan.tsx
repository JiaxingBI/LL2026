import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { mockEmployees, mockAdjustments } from '../data/mockData';
import type { Employee, Adjustment } from '../types';
import AdjustmentTable from './AdjustmentTable';

export default function AttendancePlan() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(mockAdjustments);

  const dates = ['12/5', '12/6', '12/7', '12/8', '12/9', '12/10', '12/11', '12/12'];

  const handleAutoAssign = () => {
    const newEmployees = employees.map(emp => emp);
    setEmployees(newEmployees);
    alert('Auto-assign completed (Mock)');
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

  return (
    <div className='container' style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Attendance Plan</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage shift schedules, track attendance, and handle manual adjustments.</p>
      </div>

      {/* Schedule Editor */}
      <div className='card'>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
          <div className='flex items-center gap-4'>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type='text' 
                placeholder='Search people...' 
                className='input'
                style={{ paddingLeft: '36px', width: '250px' }}
              />
            </div>
            <div className='flex gap-2'>
              {['All', 'Green', 'Blue', 'Orange', 'Yellow'].map(filter => (
                <button key={filter} className='btn btn-ghost' style={{ fontSize: '12px', padding: '4px 12px' }}>
                  {filter}
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
            Auto Assign
          </button>
        </div>

        <div className='table-container'>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th style={{ width: '150px' }}>Name</th>
                <th style={{ width: '100px' }}>Role</th>
                <th style={{ width: '100px' }}>I/D</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '100px' }}>Shift</th>
                <th style={{ width: '80px' }}>Gender</th>
                {dates.map(date => (
                  <th key={date} style={{ textAlign: 'center', minWidth: '60px', borderLeft: '1px solid #eee' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{date}</span>
                      <span style={{ fontSize: '10px', color: '#999', fontWeight: 'normal' }}>DAY</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ color: '#666' }}>{emp.id}</td>
                  <td style={{ fontWeight: '500' }}>{emp.name}</td>
                  <td style={{ color: '#666' }}>{emp.role}</td>
                  <td style={{ color: '#666' }}>{emp.indirectDirect}</td>
                  <td style={{ color: '#666' }}>{emp.status}</td>
                  <td>
                    <span className={`badge ${getShiftClass(emp.shiftTeam)}`}>
                      {emp.shiftTeam}
                    </span>
                  </td>
                  <td style={{ color: '#666' }}>{emp.gender}</td>
                  {dates.map(date => (
                    <td key={date} style={{ padding: '8px', borderLeft: '1px solid #f5f5f5' }}>
                      <input 
                        type='text' 
                        defaultValue={emp.shifts[date]?.day || '-'} 
                        style={{ width: '100%', textAlign: 'center', border: 'none', background: 'transparent', outline: 'none' }}
                      />
                    </td>
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
