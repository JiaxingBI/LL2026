import { useEffect, useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import type { Employee, ShiftTeam } from '../../types';
import { SHIFT_TEAM_VALUES, getShiftClass } from '../../constants/attendanceOptions';
import { EmptyState } from './EmptyState';

interface AddWorkerModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  employees: Employee[];
  selectedIds: Set<string>;
  selectedLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription?: string;
  availableLabel: (count: number) => string;
  confirmLabel: (count: number) => string;
  closeLabel: string;
  teamLabel: (team: 'All' | ShiftTeam) => string;
  onToggleSelect: (employeeId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase();
}

function getTeamTint(team: ShiftTeam): string {
  switch (team) {
    case 'Green':
      return 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
    case 'Blue':
      return 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
    case 'Orange':
      return 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)';
    case 'Yellow':
      return 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)';
    default:
      return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
  }
}

export default function AddWorkerModal({
  isOpen,
  title,
  subtitle,
  employees,
  selectedIds,
  selectedLabel,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  availableLabel,
  confirmLabel,
  closeLabel,
  teamLabel,
  onToggleSelect,
  onClose,
  onConfirm,
}: AddWorkerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<'All' | ShiftTeam>('All');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setTeamFilter('All');
    }
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return employees.filter(employee => {
      if (teamFilter !== 'All' && employee.shiftTeam !== teamFilter) return false;
      if (!query) return true;
      return (
        employee.id.toLowerCase().includes(query) ||
        employee.name.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query) ||
        employee.indirectDirect.toLowerCase().includes(query)
      );
    });
  }, [employees, searchQuery, teamFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.44)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="worker-modal-shell"
        style={{
          width: 'min(920px, 96vw)',
          maxHeight: 'min(720px, 92vh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.45)',
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%)',
          boxShadow: '0 32px 90px rgba(15, 23, 42, 0.24)',
          animation: 'worker-modal-in 0.2s ease-out',
        }}
      >
        <div
          style={{
            padding: '22px 22px 18px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'linear-gradient(180deg, rgba(239, 246, 255, 0.9) 0%, rgba(248, 250, 252, 0.5) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    color: '#1d4ed8',
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</div>
                  {subtitle ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>
                  ) : null}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedIds.size}</span>
                <span>{selectedLabel}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              aria-label={closeLabel}
              style={{ width: 40, height: 40, padding: 0, justifyContent: 'center', borderRadius: 999 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['All', ...SHIFT_TEAM_VALUES] as const).map(team => {
              const active = teamFilter === team;
              return (
                <button
                  key={team}
                  type="button"
                  className="btn"
                  onClick={() => setTeamFilter(team)}
                  style={{
                    padding: '7px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    border: active ? '1px solid rgba(0, 113, 227, 0.35)' : '1px solid rgba(148, 163, 184, 0.2)',
                    background: active ? 'rgba(219, 234, 254, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    color: active ? '#1d4ed8' : 'var(--text-secondary)',
                    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.7)' : 'none',
                  }}
                >
                  {teamLabel(team)}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                autoFocus
                type="text"
                className="input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                style={{ width: '100%', height: 42, paddingLeft: 40, borderRadius: 14, background: 'rgba(255, 255, 255, 0.95)' }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{availableLabel(filteredEmployees.length)}</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 22px' }}>
          <div
            style={{
              height: '100%',
              overflowY: 'auto',
              borderRadius: 20,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              padding: 12,
            }}
          >
            {filteredEmployees.length === 0 ? (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredEmployees.map(employee => {
                  const isSelected = selectedIds.has(employee.id);
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      className="btn"
                      onClick={() => onToggleSelect(employee.id)}
                      aria-pressed={isSelected}
                      style={{
                        width: '100%',
                        padding: 0,
                        borderRadius: 18,
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(239, 246, 255, 1) 0%, rgba(219, 234, 254, 0.85) 100%)'
                          : 'rgba(255, 255, 255, 0.96)',
                        border: isSelected
                          ? '1px solid rgba(59, 130, 246, 0.3)'
                          : '1px solid rgba(148, 163, 184, 0.14)',
                        boxShadow: isSelected ? '0 10px 24px rgba(59, 130, 246, 0.14)' : '0 6px 18px rgba(15, 23, 42, 0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '6px minmax(0, 1fr)', minHeight: 78 }}>
                        <div style={{ background: getTeamTint(employee.shiftTeam) }} />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            padding: '14px 16px',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 14,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: getTeamTint(employee.shiftTeam),
                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(employee.name)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{employee.name}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <span
                                  style={{
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    fontSize: 12,
                                    color: '#64748b',
                                  }}
                                >
                                  {employee.id}
                                </span>
                                <span style={{ width: 4, height: 4, borderRadius: 999, background: '#cbd5e1' }} />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  {employee.role} · {employee.indirectDirect}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span className={`badge ${getShiftClass(employee.shiftTeam)}`}>{teamLabel(employee.shiftTeam)}</span>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                border: isSelected ? '7px solid var(--accent-blue)' : '2px solid rgba(148, 163, 184, 0.4)',
                                background: isSelected ? '#fff' : 'transparent',
                                transition: 'all 0.15s ease',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '16px 22px 22px',
            borderTop: '1px solid rgba(148, 163, 184, 0.16)',
            background: 'rgba(248, 250, 252, 0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedIds.size}</span> {selectedLabel.toLowerCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {closeLabel}
            </button>
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={selectedIds.size === 0}>
              {confirmLabel(selectedIds.size)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}