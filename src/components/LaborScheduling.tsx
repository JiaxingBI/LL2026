import { useState, useRef } from 'react';
import { Users, Plus, MessageSquare, Info, Trash2, Calendar, Search } from 'lucide-react';
import { mockAssemblyLines, mockEmployees } from '../data/mockData';
import type { AssemblyLine, Employee } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function LaborScheduling() {
  const { t } = useLanguage();
  const [lines, setLines] = useState<AssemblyLine[]>(mockAssemblyLines);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddWorkerDropdown, setShowAddWorkerDropdown] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [availableEmployees] = useState<Employee[]>(mockEmployees);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleAddWorkerClick = (lineId: string) => {
    const button = buttonRefs.current[lineId];
    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280)
      });
    }
    setSelectedLineId(lineId);
    setWorkerSearchQuery('');
    setShowAddWorkerDropdown(true);
  };

  const handleSelectEmployee = (employee: Employee) => {
    if (!selectedLineId) return;
    
    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === selectedLineId) {
          // Check if worker already assigned
          const alreadyAssigned = line.assignedWorkers.some(w => w.employeeId === employee.id);
          if (alreadyAssigned) return line;
          
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
    
    setShowAddWorkerDropdown(false);
    setSelectedLineId(null);
    setWorkerSearchQuery('');
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
        <div className="flex items-center gap-2">
          <Calendar size={18} color="var(--accent-blue)" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              fontSize: '14px',
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          />
        </div>
        <div className="flex" style={{ gap: '12px' }}>
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
      <div className="grid grid-cols-4">
        {lines.map((line) => (
          <div key={line.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="flex justify-between" style={{ alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{line.name}</h3>
              <Info size={16} color="#d1d5db" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div className="flex justify-between" style={{ fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('labor.capacity')}</span>
                <span style={{ color: getCapacityText(line.currentWorkers, line.capacity) }}>
                  {line.currentWorkers} <span style={{ color: '#d1d5db' }}>/</span> {line.capacity}
                </span>
              </div>
              <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '6px' }}>
                <div 
                  style={{ 
                    height: '6px', 
                    borderRadius: '999px', 
                    transition: 'all 0.5s',
                    background: getCapacityColor(line.currentWorkers, line.capacity),
                    width: `${Math.min((line.currentWorkers / line.capacity) * 100, 100)}%` 
                  }} 
                ></div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {line.assignedWorkers.length === 0 ? (
                <div style={{ height: '128px', border: '2px dashed #f3f4f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <Users size={32} style={{ marginBottom: '8px', opacity: 0.2 }} />
                  <span style={{ fontSize: '12px' }}>{t('labor.noWorkers')}</span>
                </div>
              ) : (
                line.assignedWorkers.map((worker) => (
                  <div key={worker.employeeId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                      {worker.initials}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{worker.name}</p>
                      <p style={{ fontSize: '10px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }}></span>
                        {worker.experienceCount} {t('labor.shifts')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              ref={(el) => { buttonRefs.current[line.id] = el; }}
              onClick={() => handleAddWorkerClick(line.id)}
              className="btn btn-ghost" 
              style={{ marginTop: '16px', width: '100%', border: '1px dashed #d1d5db', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <Plus size={16} />
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
              {availableEmployees
                .filter(emp => 
                  emp.name.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
                  emp.id.toLowerCase().includes(workerSearchQuery.toLowerCase()) ||
                  emp.role.toLowerCase().includes(workerSearchQuery.toLowerCase())
                )
                .map((employee) => (
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
    scm-history-item:c%3A%5CUsers%5Ccn8IsaLi%5COneDrive%20-%20LEGO%5CDesktop%5Cgit.workspace%5CLaborLink%5CLaborLink_App?%7B%22repositoryId%22%3A%22scm0%22%2C%22historyItemId%22%3A%222b2bbc604972784ec29efd12f30db2b6af8fd518%22%2C%22historyItemParentId%22%3A%22059abad157eb5d20101886cfa5431a2f727d603b%22%2C%22historyItemDisplayId%22%3A%222b2bbc6%22%7D                <span className={`badge ${getShiftClass(employee.shiftTeam)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {employee.shiftTeam}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
