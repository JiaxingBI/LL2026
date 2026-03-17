import { useCallback, useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Adjustment, Employee, Role, ShiftTeam, WorkStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import CustomDatePicker from './ui/CustomDatePicker';
import CustomSelect from './ui/CustomSelect';
import { buildRoleOptions, buildShiftTeamOptions, buildWorkStatusOptions } from '../utils/displayLabels';

interface AdjustmentTableProps {
  adjustments: Adjustment[];
  setAdjustments: (adjustments: Adjustment[]) => void;
  selectedShift: string;
  employees: Employee[];
}

function createLocalAdjustmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdjustmentTable({ adjustments, setAdjustments, selectedShift, employees }: AdjustmentTableProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const roleOptions = useMemo(() => buildRoleOptions(t), [t]);
  const workStatusOptions = useMemo(() => buildWorkStatusOptions(t), [t]);
  const shiftTeamOptions = useMemo(() => buildShiftTeamOptions(t), [t]);
  const employeeOptions = useMemo(
    () => employees.map(employee => ({ value: employee.id, label: `${employee.id} · ${employee.name}` })),
    [employees],
  );

  // Filter adjustments by selected shift
  const filteredAdjustments = selectedShift === 'All' 
    ? adjustments 
    : adjustments.filter(adj => adj.shiftTeam === selectedShift);

  const updateAdjustment = useCallback((id: string, field: keyof Adjustment, value: string | number | boolean) => {
    setAdjustments(
      adjustments.map((adj) => (adj.id === id ? { ...adj, [field]: value } : adj))
    );
  }, [adjustments, setAdjustments]);

  const handleEmployeeChange = useCallback((id: string, employeeId: string) => {
    const employee = employees.find(item => item.id === employeeId);
    setAdjustments(
      adjustments.map(adj => {
        if (adj.id !== id) return adj;
        if (!employee) {
          return {
            ...adj,
            employeeId: '',
            name: '',
          };
        }
        return {
          ...adj,
          employeeId: employee.id,
          name: employee.name,
          role: employee.role,
          indirectDirect: employee.indirectDirect,
          workStatus: employee.status,
          shiftTeam: employee.shiftTeam,
          gender: employee.gender,
        };
      }),
    );
  }, [adjustments, employees, setAdjustments]);

  const addAdjustment = useCallback(() => {
    const newAdjustment: Adjustment = {
      id: createLocalAdjustmentId(),
      employeeId: '',
      name: '',
      role: 'Ops.L1',
      indirectDirect: 'Direct',
      workStatus: 'Prod.',
      shiftTeam: 'Green',
      gender: 'Male',
      date: new Date().toISOString().split('T')[0],
      isNight: false,
      hours: 12,
      reason: 'Overtime',
      comments: '',
      source: 'local',
      synced: false,
    };
    setAdjustments([...adjustments, newAdjustment]);
  }, [adjustments, setAdjustments]);

  const removeAdjustment = useCallback((id: string) => {
    setAdjustments(adjustments.filter((adj) => adj.id !== id));
  }, [adjustments, setAdjustments]);

  const updateHours = useCallback((id: string, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const nextHours = Number.isFinite(parsed) ? Math.max(0, Math.min(14, parsed)) : 0;
    updateAdjustment(id, 'hours', nextHours);
  }, [updateAdjustment]);

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
          <div style={{ padding: '10px 12px', background: '#fafafa', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={addAdjustment} className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 12px' }}>
              <Plus size={16} />
              {t('adjustment.add')}
            </button>
          </div>
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
                      <CustomSelect
                        compact
                        value={adj.employeeId}
                        onChange={(value) => handleEmployeeChange(adj.id, value)}
                        options={[{ value: '', label: t('attendance.selectEmployee') }, ...employeeOptions]}
                        minWidth={220}
                      />
                    </td>
                    <td style={{ fontWeight: '500', position: 'sticky', left: '40px', background: 'white', zIndex: 1, width: '80px', minWidth: '80px' }}>
                      <span style={{ display: 'inline-block', minWidth: '100%', color: adj.name ? 'inherit' : '#999' }}>
                        {adj.name || t('attendance.selectEmployee')}
                      </span>
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '120px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <CustomSelect
                        compact
                        value={adj.role || 'Ops.L1'}
                        onChange={(v) => updateAdjustment(adj.id, 'role', v as Role)}
                        options={roleOptions}
                      />
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '190px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <CustomSelect
                        compact
                        value={adj.indirectDirect || 'Direct'}
                        onChange={(v) => updateAdjustment(adj.id, 'indirectDirect', v)}
                        options={[
                          { value: 'Direct', label: t('id.direct') },
                          { value: 'Indirect', label: t('id.indirect') },
                        ]}
                      />
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '260px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <CustomSelect
                        compact
                        value={adj.workStatus || 'Prod.'}
                        onChange={(v) => updateAdjustment(adj.id, 'workStatus', v as WorkStatus)}
                        options={workStatusOptions}
                      />
                    </td>
                    <td style={{ position: 'sticky', left: '330px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px' }}>
                      <CustomSelect
                        compact
                        value={adj.shiftTeam || 'Green'}
                        onChange={(v) => updateAdjustment(adj.id, 'shiftTeam', v as ShiftTeam)}
                        options={shiftTeamOptions}
                      />
                    </td>
                    <td style={{ color: '#666', position: 'sticky', left: '400px', background: 'white', zIndex: 1, width: '70px', minWidth: '70px', boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
                      <CustomSelect
                        compact
                        value={adj.gender || 'Male'}
                        onChange={(v) => updateAdjustment(adj.id, 'gender', v)}
                        options={[
                          { value: 'Male', label: t('gender.male') },
                          { value: 'Female', label: t('gender.female') },
                        ]}
                      />
                    </td>
                    <td>
                      <CustomDatePicker
                        compact
                        value={adj.date}
                        onChange={(nextValue) => updateAdjustment(adj.id, 'date', nextValue)}
                        minWidth={140}
                      />
                    </td>
                    <td>
                      <CustomSelect
                        compact
                        value={adj.isNight ? 'Night' : 'Day'}
                        onChange={(v) => updateAdjustment(adj.id, 'isNight', v === 'Night')}
                        options={[
                          { value: 'Day', label: t('attendance.day') },
                          { value: 'Night', label: t('attendance.night') },
                        ]}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={adj.hours}
                        min={0}
                        max={14}
                        onChange={(e) => updateHours(adj.id, e.target.value)}
                        aria-label={`${t('adjustment.duration')} ${adj.name || adj.employeeId || adj.id}`}
                        style={{ width: '60px', border: 'none', background: 'transparent', textAlign: 'center', outline: 'none' }}
                      />
                    </td>
                    <td>
                      <CustomSelect
                        compact
                        value={adj.reason}
                        onChange={(v) => updateAdjustment(adj.id, 'reason', v)}
                        options={[
                          { value: 'Overtime', label: t('adjustment.overtime') },
                          { value: 'Leave', label: t('adjustment.leave') },
                          { value: 'Transfer', label: t('adjustment.transfer') },
                          { value: 'Edit', label: t('adjustment.edit') },
                        ]}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={adj.comments}
                        onChange={(e) => updateAdjustment(adj.id, 'comments', e.target.value)}
                        placeholder={t('adjustment.addNotes')}
                        aria-label={`${t('adjustment.notes')} ${adj.name || adj.employeeId || adj.id}`}
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
        </div>
      )}
    </div>
  );
}