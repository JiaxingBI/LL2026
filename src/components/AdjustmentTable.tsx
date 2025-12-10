import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Adjustment } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AdjustmentTableProps {
  adjustments: Adjustment[];
  setAdjustments: (adjustments: Adjustment[]) => void;
  selectedShift: string;
}

export default function AdjustmentTable({ adjustments, setAdjustments, selectedShift }: AdjustmentTableProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const getShiftClass = (team: string) => {
    switch (team) {
      case 'Green': return 'badge-green';
      case 'Blue': return 'badge-blue';
      case 'Orange': return 'badge-orange';
      case 'Yellow': return 'badge-yellow';
      default: return '';
    }
  };

  // Filter adjustments by selected shift
  const filteredAdjustments = selectedShift === 'All' 
    ? adjustments 
    : adjustments.filter(adj => adj.shiftTeam === selectedShift);

  const updateAdjustment = (id: string, field: keyof Adjustment, value: string | number | boolean) => {
    setAdjustments(
      adjustments.map((adj) => (adj.id === id ? { ...adj, [field]: value } : adj))
    );
  };

  const addAdjustment = () => {
    const newAdjustment: Adjustment = {
      id: Date.now().toString(),
      employeeId: '',
      name: '',
      role: '',
      indirectDirect: 'Direct',
      workStatus: 'Prod.',
      shiftTeam: 'Green',
      gender: 'Male',
      date: new Date().toISOString().split('T')[0],
      isNight: false,
      hours: 12,
      reason: 'Overtime',
      comments: ''
    };
    setAdjustments([...adjustments, newAdjustment]);
  };

  const removeAdjustment = (id: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== id));
  };

  return (
    <div className="card" style={{ flex: isExpanded ? 1 : 'none', display: 'flex', flexDirection: 'column', minHeight: isExpanded ? '200px' : 'auto' }}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', border: 'none', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <h2 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{t('adjustment.title')}</h2>
          <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{filteredAdjustments.length}</span>
        </div>
        {isExpanded ? <ChevronUp size={16} color="#666" /> : <ChevronDown size={16} color="#666" />}
      </button>
      
      {isExpanded && (
        <div className="table-container" style={{ overflowX: 'auto', flex: 1, overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '40px', minWidth: '40px', position: 'sticky', left: 0, top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.id')}</th>
                <th style={{ width: '80px', minWidth: '80px', position: 'sticky', left: '40px', top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.name')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '120px', top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.role')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '190px', top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.id_status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '260px', top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.status')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '330px', top: 0, background: '#fafafa', zIndex: 3 }}>{t('attendance.shift')}</th>
                <th style={{ width: '70px', minWidth: '70px', position: 'sticky', left: '400px', top: 0, background: '#fafafa', zIndex: 3, boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>{t('attendance.gender')}</th>
                <th style={{ minWidth: '100px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}>{t('adjustment.date')}</th>
                <th style={{ minWidth: '80px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}>{t('adjustment.dayNight')}</th>
                <th style={{ minWidth: '80px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}>{t('adjustment.duration')}</th>
                <th style={{ minWidth: '100px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}>{t('adjustment.type')}</th>
                <th style={{ minWidth: '150px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}>{t('adjustment.notes')}</th>
                <th style={{ width: '40px', position: 'sticky', top: 0, background: '#fafafa', zIndex: 2 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((adj) => {
                return (
                  <tr key={adj.id}>
                    <td style={{ color: '#666', position: 'sticky', left: 0, background: 'white', zIndex: 1, width: '40px', minWidth: '40px' }}>
                      <input 
                        type="text" 
                        value={adj.employeeId}
                        onChange={(e) => updateAdjustment(adj.id, 'employeeId', e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: '#666' }}
                      />
                    </td>
                    <td style={{ fontWeight: '500', position: 'sticky', left: '40px', background: 'white', zIndex: 1, width: '80px', minWidth: '80px' }}>
                      <input 
                        type="text" 
                        value={adj.name}
                        onChange={(e) => updateAdjustment(adj.id, 'name', e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontWeight: '500' }}
                      />
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '120px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select 
                        value={adj.role || ''} 
                        onChange={(e) => updateAdjustment(adj.id, 'role', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <option value="TC.L1">TC.L1</option>
                        <option value="TC.L2">TC.L2</option>
                        <option value="TC.L3">TC.L3</option>
                        <option value="Hall Asist">Hall Asist</option>
                        <option value="Infeeder">Infeeder</option>
                        <option value="Sr.Infeeder">Sr.Infeeder</option>
                        <option value="Ops.L1">Ops.L1</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '190px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select 
                        value={adj.indirectDirect || 'Direct'} 
                        onChange={(e) => updateAdjustment(adj.id, 'indirectDirect', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <option value="Direct">{t('id.direct')}</option>
                        <option value="Indirect">{t('id.indirect')}</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '260px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select 
                        value={adj.workStatus || 'Prod.'} 
                        onChange={(e) => updateAdjustment(adj.id, 'workStatus', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <option value="Prod.">Prod.</option>
                        <option value="Jail">Jail</option>
                        <option value="DailyProduction">DailyProduction</option>
                      </select>
                    </td>
                    <td style={{ position: 'sticky', left: '330px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <select 
                        value={adj.shiftTeam || 'Green'} 
                        onChange={(e) => updateAdjustment(adj.id, 'shiftTeam', e.target.value)}
                        className={`badge ${getShiftClass(adj.shiftTeam || '')}`} 
                        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Green">{t('filter.green')}</option>
                        <option value="Blue">{t('filter.blue')}</option>
                        <option value="Orange">{t('filter.orange')}</option>
                        <option value="Yellow">{t('filter.yellow')}</option>
                      </select>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '400px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
                      <select 
                        value={adj.gender || 'Male'} 
                        onChange={(e) => updateAdjustment(adj.id, 'gender', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <option value="Male">{t('gender.male')}</option>
                        <option value="Female">{t('gender.female')}</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="date" 
                        value={adj.date}
                        onChange={(e) => updateAdjustment(adj.id, 'date', e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontFamily: 'inherit', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <select 
                        value={adj.isNight ? 'Night' : 'Day'}
                        onChange={(e) => updateAdjustment(adj.id, 'isNight', e.target.value === 'Night')}
                        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Day">{t('attendance.day')}</option>
                        <option value="Night">{t('attendance.night')}</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={adj.hours}
                        onChange={(e) => updateAdjustment(adj.id, 'hours', parseInt(e.target.value) || 0)}
                        style={{ width: '60px', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <select 
                        value={adj.reason}
                        onChange={(e) => updateAdjustment(adj.id, 'reason', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="Overtime">{t('adjustment.overtime')}</option>
                        <option value="Leave">{t('adjustment.leave')}</option>
                        <option value="Transfer">{t('adjustment.transfer')}</option>
                        <option value="Edit">{t('adjustment.edit')}</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={adj.comments}
                        onChange={(e) => updateAdjustment(adj.id, 'comments', e.target.value)}
                        placeholder={t('adjustment.addNotes')}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <button 
                        onClick={() => removeAdjustment(adj.id)}
                        className="btn btn-ghost"
                        style={{ padding: '4px', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={addAdjustment} className="btn btn-ghost" style={{ fontSize: '13px' }}>
              <Plus size={16} />
              {t('adjustment.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}