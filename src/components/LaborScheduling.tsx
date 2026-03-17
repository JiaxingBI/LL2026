import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, X, MessageCircle, RefreshCw, UserCheck, ClipboardList } from 'lucide-react';
import { useDataverseEmployees } from '../hooks/useDataverseEmployees';
import type { AssemblyLine } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_ASSEMBLY_LINES } from '../constants/assemblyLines';
import { CardSkeleton } from './ui/Skeleton';
import CustomSelect from './ui/CustomSelect';
import { renderShiftSelectOption, renderShiftSelectValue } from '../utils/shiftSelectRenderers';
import AddWorkerModal from './ui/AddWorkerModal';
import { buildPendingLeaveKey, mergeEmployeesWithLocal, readPersistedAttendancePlanState } from '../utils/attendancePlanPersistence';
import { getAssemblyLineDisplayName, getEmployeeMetaLabel, translateKnownErrorMessage } from '../utils/displayLabels';

// Default assembly lines — shared with EmployeeView
const defaultAssemblyLines: AssemblyLine[] = DEFAULT_ASSEMBLY_LINES;

interface LaborSchedulingProps {
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

export default function LaborScheduling({ isInitialized = true }: LaborSchedulingProps) {
  const { t, language } = useLanguage();
  const { employees, isLoading, error, refetch } = useDataverseEmployees(isInitialized);
  
  const [lines, setLines] = useState<AssemblyLine[]>(defaultAssemblyLines);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

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

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const selectedShiftInfo = useMemo(() => {
    if (!selectedShift) return null;
    const lastDash = selectedShift.lastIndexOf('-');
    const isoDate = selectedShift.substring(0, lastDash);
    const shiftSuffix = selectedShift.substring(lastDash + 1);
    const [, month, day] = isoDate.split('-').map(Number);
    const shiftType: 'Day' | 'Night' = shiftSuffix === 'night' ? 'Night' : 'Day';
    return {
      isoDate,
      dateKey: `${month}/${day}`,
      shiftType,
      isNight: shiftType === 'Night',
    };
  }, [selectedShift]);

  const planYear = useMemo(() => {
    if (!selectedShiftInfo) return getUtc8Now().getFullYear();
    return Number(selectedShiftInfo.isoDate.split('-')[0]);
  }, [selectedShiftInfo]);

  const persistedState = useMemo(() => readPersistedAttendancePlanState(planYear), [employees, planYear, selectedShift]);

  const displayEmployees = useMemo(() => {
    return persistedState ? mergeEmployeesWithLocal(employees, persistedState.employees) : employees;
  }, [employees, persistedState]);

  const pendingLeaveIds = useMemo(() => new Set(persistedState?.pendingLeaveIds ?? []), [persistedState]);
  
  // Filter employees based on selected date/shift - only show those with attendance
  const availableEmployees = useMemo(() => {
    if (!selectedShiftInfo) return displayEmployees;

    return displayEmployees.filter(employee => {
      const pendingKey = buildPendingLeaveKey(employee.id, selectedShiftInfo.isoDate, selectedShiftInfo.shiftType);
      if (pendingLeaveIds.has(pendingKey)) return false;
      const shiftEntry = employee.shifts[selectedShiftInfo.dateKey];
      if (!shiftEntry) return false;
      const shiftValue = selectedShiftInfo.isNight ? shiftEntry.night : shiftEntry.day;
      const numValue = parseFloat(shiftValue);
      return !isNaN(numValue) && numValue > 0;
    });
  }, [displayEmployees, pendingLeaveIds, selectedShiftInfo]);

  const allAssignedIds = useMemo(
    () => new Set(lines.flatMap(line => line.assignedWorkers.map(worker => worker.employeeId))),
    [lines],
  );

  const assignableEmployees = useMemo(
    () => availableEmployees.filter(employee => !allAssignedIds.has(employee.id)),
    [allAssignedIds, availableEmployees],
  );

  const totalCapacity = useMemo(() => lines.reduce((sum, line) => sum + line.capacity, 0), [lines]);
  const totalAssignedWorkers = useMemo(() => lines.reduce((sum, line) => sum + line.currentWorkers, 0), [lines]);
  const totalOpenSlots = Math.max(totalCapacity - totalAssignedWorkers, 0);

  const selectedLine = useMemo(
    () => lines.find(line => line.id === selectedLineId) ?? null,
    [lines, selectedLineId],
  );
  
  // Drag and drop state
  const [draggedWorker, setDraggedWorker] = useState<{ employeeId: string; fromLineId: string; name: string; initials: string; experienceCount: number } | null>(null);
  const [dragOverLineId, setDragOverLineId] = useState<string | null>(null);
  
  // Comment tooltip state
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string>('');
  const commentButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [commentPopover, setCommentPopover] = useState<{
    lineId: string;
    mode: 'preview' | 'edit';
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const getCommentPopoverPosition = useCallback((lineId: string, mode: 'preview' | 'edit') => {
    const button = commentButtonRefs.current[lineId];
    if (!button || typeof window === 'undefined') return null;
    const rect = button.getBoundingClientRect();
    const width = Math.min(mode === 'edit' ? 320 : 260, window.innerWidth - 24);
    const estimatedHeight = mode === 'edit' ? 220 : 96;
    const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
    let top = rect.bottom + 8;

    if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - estimatedHeight - 8);
    }

    return { lineId, mode, top, left, width };
  }, []);

  const openCommentPreview = useCallback((lineId: string) => {
    if (editingLineId) return;
    const nextPosition = getCommentPopoverPosition(lineId, 'preview');
    if (nextPosition) setCommentPopover(nextPosition);
  }, [editingLineId, getCommentPopoverPosition]);

  const closeCommentPreview = useCallback((lineId: string) => {
    setCommentPopover(current => {
      if (!current || current.lineId !== lineId || current.mode !== 'preview') return current;
      return null;
    });
  }, []);

  const openCommentEditor = useCallback((lineId: string, comment: string) => {
    const nextPosition = getCommentPopoverPosition(lineId, 'edit');
    setEditingLineId(lineId);
    setEditingComment(comment);
    if (nextPosition) setCommentPopover(nextPosition);
  }, [getCommentPopoverPosition]);

  const closeCommentEditor = useCallback(() => {
    setEditingLineId(null);
    setEditingComment('');
    setCommentPopover(current => current?.mode === 'edit' ? null : current);
  }, []);

  useEffect(() => {
    if (!commentPopover) return;

    const syncPosition = () => {
      const nextPosition = getCommentPopoverPosition(commentPopover.lineId, commentPopover.mode);
      if (nextPosition) {
        setCommentPopover(nextPosition);
      }
    };

    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [commentPopover, getCommentPopoverPosition]);

  useEffect(() => {
    if (commentPopover?.mode !== 'edit') return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-comment-popover="true"]')) return;
      if (target.closest('[data-comment-trigger="true"]')) return;
      closeCommentEditor();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [closeCommentEditor, commentPopover]);

  const handleAddWorkerClick = (lineId: string) => {
    setSelectedLineId(lineId);
    setSelectedEmployeeIds(new Set());
    setShowAddWorkerModal(true);
  };

  const handleAssignEmployees = () => {
    if (!selectedLineId) return;
    const selectedEmployees = assignableEmployees.filter(employee => selectedEmployeeIds.has(employee.id));
    if (selectedEmployees.length === 0) return;

    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === selectedLineId) {
          return {
            ...line,
            currentWorkers: line.currentWorkers + selectedEmployees.length,
            assignedWorkers: [
              ...line.assignedWorkers,
              ...selectedEmployees.map(employee => ({
                employeeId: employee.id,
                name: employee.name,
                initials: employee.name.split(' ').map(n => n[0]).join('').toUpperCase(),
                experienceCount: Math.floor(Math.random() * 50) + 1,
              })),
            ]
          };
        }
        return line;
      })
    );

    setSelectedEmployeeIds(new Set());
    setShowAddWorkerModal(false);
  };

  const toggleSelectedEmployee = (employeeId: string) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  };

  const handleRemoveWorker = (lineId: string, employeeId: string) => {
    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            currentWorkers: Math.max(0, line.currentWorkers - 1),
            assignedWorkers: line.assignedWorkers.filter(w => w.employeeId !== employeeId)
          };
        }
        return line;
      })
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, worker: { employeeId: string; name: string; initials: string; experienceCount: number }, fromLineId: string) => {
    setDraggedWorker({ ...worker, fromLineId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, lineId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLineId(lineId);
  };

  const handleDragLeave = () => {
    setDragOverLineId(null);
  };

  const handleDrop = (e: React.DragEvent, toLineId: string) => {
    e.preventDefault();
    setDragOverLineId(null);
    
    if (!draggedWorker || draggedWorker.fromLineId === toLineId) {
      setDraggedWorker(null);
      return;
    }

    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id === draggedWorker.fromLineId) {
          // Remove from source line
          return {
            ...line,
            currentWorkers: Math.max(0, line.currentWorkers - 1),
            assignedWorkers: line.assignedWorkers.filter(w => w.employeeId !== draggedWorker.employeeId)
          };
        }
        if (line.id === toLineId) {
          // Add to target line
          return {
            ...line,
            currentWorkers: line.currentWorkers + 1,
            assignedWorkers: [
              ...line.assignedWorkers,
              {
                employeeId: draggedWorker.employeeId,
                name: draggedWorker.name,
                initials: draggedWorker.initials,
                experienceCount: draggedWorker.experienceCount
              }
            ]
          };
        }
        return line;
      })
    );
    
    setDraggedWorker(null);
  };

  const handleDragEnd = () => {
    setDraggedWorker(null);
    setDragOverLineId(null);
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
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', padding: '24px' }}>
        <div style={{ color: '#d32f2f', fontSize: '18px', fontWeight: 500 }}>⚠️ {t('common.errorLoadingData')}</div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{translateKnownErrorMessage(error, t)}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%' }}>
      {/* KPI Cards */}
      <div className="grid grid-cols-3" style={{ gap: 10 }}>
        <div className="card" style={{ padding: '14px 16px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.availableWorkers')}</p>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>{assignableEmployees.length}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>/ {availableEmployees.length}</span>
              </div>
              <p style={{ fontSize: '11px', fontWeight: '500', color: assignableEmployees.length > 0 ? 'var(--success)' : 'var(--warning)', marginTop: '3px', marginBottom: 0 }}>
                • {Math.max(availableEmployees.length - assignableEmployees.length, 0)} {t('labor.assignedWorkers')}
              </p>
            </div>
            <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '8px' }}>
              <Users size={16} color="var(--accent-blue)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', position: 'relative' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.assignedWorkers')}</p>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>{totalAssignedWorkers}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>/ {totalCapacity}</span>
              </div>
              <p style={{ fontSize: '11px', fontWeight: '500', color: totalAssignedWorkers >= totalCapacity ? 'var(--success)' : 'var(--warning)', marginTop: '3px', marginBottom: 0 }}>
                • {totalOpenSlots} {t('labor.openSlots')}
              </p>
            </div>
            <div style={{ padding: '6px', background: '#eefbf3', borderRadius: '8px' }}>
              <UserCheck size={16} color="var(--success)" />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="flex justify-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', margin: 0 }}>{t('labor.openSlots')}</p>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>{totalOpenSlots}</span>
                <span style={{ fontSize: '12px', color: '#999' }}>/ {totalCapacity}</span>
              </div>
            </div>
            <ClipboardList size={14} color="#d1d5db" />
          </div>
          <div style={{ width: '100%', background: '#f3f4f6', borderRadius: '999px', height: '5px', marginTop: '12px' }}>
            <div style={{ background: 'var(--accent-blue)', height: '5px', borderRadius: '999px', width: `${totalCapacity === 0 ? 0 : ((totalCapacity - totalOpenSlots) / totalCapacity) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="card" style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <CustomSelect
          standalone
          value={selectedShift}
          onChange={(v) => setSelectedShift(v)}
          options={shiftOptions}
          minWidth="220px"
          renderValue={renderShiftSelectValue}
          renderOption={renderShiftSelectOption}
        />
        <button 
          onClick={() => refetch()}
          disabled={isLoading}
          className="btn"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'white',
            border: '1px solid #e5e7eb',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
          title={t('common.refreshData')}
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>

      {/* Assembly Lines */}
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
              border: dragOverLineId === line.id ? '2px solid var(--accent-blue)' : undefined,
              background: dragOverLineId === line.id ? '#f0f7ff' : undefined,
              transition: 'border 0.15s, background 0.15s',
              overflow: 'visible',
              position: 'relative'
            }}
            onDragOver={(e) => handleDragOver(e, line.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, line.id)}
          >
            <div 
              className="flex justify-between line-card-header" 
              style={{ alignItems: 'flex-start', marginBottom: '10px', position: 'relative' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0, lineHeight: '1.3', color: '#1f2937' }}>{line.id}</h3>
                  <span style={{ padding: '3px 8px', borderRadius: 999, background: 'rgba(219, 234, 254, 0.8)', color: '#1d4ed8', fontSize: 11, fontWeight: 700 }}>
                    {line.capacity - line.currentWorkers > 0 ? `${line.capacity - line.currentWorkers} ${t('common.open')}` : t('common.full')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                  {getAssemblyLineDisplayName(line.id, line.name, t)}
                </p>
              </div>
              <div 
                style={{ position: 'relative' }}
                onMouseEnter={() => openCommentPreview(line.id)}
                onMouseLeave={() => closeCommentPreview(line.id)}
              >
                <button
                  type="button"
                  ref={(element) => { commentButtonRefs.current[line.id] = element; }}
                  data-comment-trigger="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => openCommentEditor(line.id, line.comment || '')}
                >
                <MessageCircle 
                  size={14} 
                  style={{ 
                    flexShrink: 0,
                    color: line.comment ? 'var(--accent-blue)' : '#d1d5db',
                    transition: 'color 0.2s'
                  }} 
                />
                </button>
              </div>
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, worker, line.id)}
                    onDragEnd={handleDragEnd}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '8px 10px', 
                      background: draggedWorker?.employeeId === worker.employeeId ? '#e5e7eb' : '#f9fafb', 
                      borderRadius: '12px', 
                      border: '1px solid #eef2f7',
                      cursor: 'grab',
                      opacity: draggedWorker?.employeeId === worker.employeeId ? 0.5 : 1,
                      transition: 'opacity 0.15s, background 0.15s'
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#4b5563', flexShrink: 0 }}>
                      {worker.initials}
                    </div>
                    <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveWorker(line.id, worker.employeeId); }}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        transition: 'color 0.15s, background 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => handleAddWorkerClick(line.id)}
              className="btn btn-ghost" 
              style={{ marginTop: '12px', width: '100%', border: '1px dashed #cbd5e1', justifyContent: 'center', color: 'var(--text-secondary)', padding: '10px 12px', fontSize: '12px', borderRadius: '12px', background: '#fafcff' }}
            >
              <Plus size={12} />
              {t('labor.addWorker')}
            </button>
          </div>
        ))}
      </div>

      <AddWorkerModal
        isOpen={showAddWorkerModal}
        title={selectedLine ? `${t('labor.addWorker')} · ${selectedLine.id}` : t('labor.addWorker')}
        subtitle={selectedShiftInfo ? `${selectedLine?.name ?? ''} • ${shiftOptions.find(option => option.value === selectedShift)?.label ?? ''}` : undefined}
        employees={assignableEmployees}
        selectedIds={selectedEmployeeIds}
        selectionSummaryLabel={(count) => `${count} ${t('attendance.selected')}`}
        searchPlaceholder={t('attendance.searchByIdOrName')}
        emptyTitle={assignableEmployees.length === 0 ? t('labor.allAssigned') : t('attendance.noMatchingWorkers')}
        emptyDescription={t('labor.availableWorkersHint')}
        availableLabel={(count) => `${count} ${t('labor.availableWorkers').toLowerCase()}`}
        confirmLabel={(count) => `${t('labor.assignSelected')} (${count})`}
        closeLabel={t('attendance.close')}
        employeeMetaLabel={(employee) => getEmployeeMetaLabel(employee, t)}
        teamLabel={(team) => team === 'All' ? t('filter.all') : t(`filter.${team.toLowerCase()}`)}
        onToggleSelect={toggleSelectedEmployee}
        onClose={() => {
          setSelectedEmployeeIds(new Set());
          setShowAddWorkerModal(false);
        }}
        onConfirm={handleAssignEmployees}
      />

      {commentPopover && typeof document !== 'undefined' && createPortal(
        <div
          data-comment-popover="true"
          style={{
            position: 'fixed',
            top: commentPopover.top,
            left: commentPopover.left,
            width: commentPopover.width,
            zIndex: 20001,
            padding: commentPopover.mode === 'edit' ? 10 : '10px 12px',
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.24)',
            background: 'rgba(255, 255, 255, 0.98)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
            color: 'var(--text-secondary)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {commentPopover.mode === 'preview' ? (
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              {lines.find(line => line.id === commentPopover.lineId)?.comment || t('labor.commentEmpty')}
            </div>
          ) : (
            <div>
              <textarea
                value={editingComment}
                onChange={(event) => setEditingComment(event.target.value)}
                placeholder={t('labor.commentPlaceholder')}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '96px',
                  padding: '10px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeCommentEditor}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  {t('attendance.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLines(prev => prev.map(line => (
                      line.id === commentPopover.lineId ? { ...line, comment: editingComment } : line
                    )));
                    closeCommentEditor();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
