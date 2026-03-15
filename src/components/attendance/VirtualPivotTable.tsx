/**
 * VirtualPivotTable
 *
 * Renders the attendance schedule as a sticky-header pivot table with
 * virtualized rows (via @tanstack/react-virtual). This prevents the browser
 * from rendering thousands of DOM nodes when > 100 employees are loaded.
 */
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Employee } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface CellChange {
  emp: Employee;
  date: string;
  isNight: boolean;
  value: string;
}

interface VirtualPivotTableProps {
  employees: Employee[];
  dates: string[];
  savedEmployees: Employee[];
  onCellChange: (change: CellChange) => void;
  onCellBlur: (change: CellChange) => void;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  getRowBackgroundColor: (team: string) => string;
  isToday: (dateStr: string) => boolean;
  t: (key: string) => string;
  handleEmployeeUpdate: (empId: string, field: keyof Employee, value: string) => void;
}

/** Row height in pixels — must match the actual rendered row height. */
const ROW_HEIGHT = 40;

export function VirtualPivotTable({
  employees,
  dates,
  savedEmployees,
  onCellBlur,
  setEmployees,
  getRowBackgroundColor,
  isToday,
  t,
  handleEmployeeUpdate,
}: VirtualPivotTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: employees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const totalHeight = rowVirtualizer.getTotalSize();
  // Pad top/bottom to maintain scroll position
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  return (
    <div
      ref={parentRef}
      className="table-container"
      style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}
    >
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
        <thead>
          <tr>
            <th style={stickyHead(0, 40)}>   {t('attendance.id')}</th>
            <th style={stickyHead(40, 80)}> {t('attendance.name')}</th>
            <th style={stickyHead(120, 70)}>{t('attendance.role')}</th>
            <th style={stickyHead(190, 70)}>{t('attendance.id_status')}</th>
            <th style={stickyHead(260, 70)}>{t('attendance.status')}</th>
            <th style={stickyHead(330, 70)}>{t('attendance.shift')}</th>
            <th style={{ ...stickyHead(400, 70), boxShadow: '2px 0 5px rgba(0,0,0,0.1)' }}>
              {t('attendance.gender')}
            </th>
            {dates.map(date => {
              const today = isToday(date);
              return (
                <React.Fragment key={date}>
                  <th style={dateHead(today)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: today ? 'bold' : 'normal' }}>{date}</span>
                      <span style={{ fontSize: 10, color: today ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>
                        {t('attendance.day')}
                      </span>
                    </div>
                  </th>
                  <th style={dateHead(today)}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: today ? 'bold' : 'normal' }}>{date}</span>
                      <span style={{ fontSize: 10, color: today ? 'rgba(255,255,255,0.8)' : '#999', fontWeight: 'normal' }}>
                        {t('attendance.night')}
                      </span>
                    </div>
                  </th>
                </React.Fragment>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td colSpan={7 + dates.length * 2} style={{ height: paddingTop, padding: 0, border: 'none' }} />
            </tr>
          )}

          {virtualRows.map(virtualRow => {
            const emp = employees[virtualRow.index];
            if (!emp) return null;
            const rowBg = getRowBackgroundColor(emp.shiftTeam);

            return (
              <tr
                key={emp.id}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{ backgroundColor: rowBg, height: ROW_HEIGHT }}
              >
                {/* Sticky identity columns */}
                <td style={{ color: '#666', ...stickyCell(0, 40, rowBg) }}>{emp.id}</td>
                <td style={{ fontWeight: 500, ...stickyCell(40, 80, rowBg) }}>{emp.name}</td>
                <td style={{ color: '#666', ...stickyCell(120, 70, rowBg) }}>
                  <CustomSelect
                    compact
                    value={emp.role}
                    onChange={v => handleEmployeeUpdate(emp.id, 'role', v)}
                    options={['TC.L1','TC.L2','TC.L3','Hall Asist','Infeeder','Sr.Infeeder','Ops.L1'].map(r => ({ value: r, label: r }))}
                  />
                </td>
                <td style={{ color: '#666', ...stickyCell(190, 70, rowBg) }}>
                  <CustomSelect
                    compact
                    value={emp.indirectDirect}
                    onChange={v => handleEmployeeUpdate(emp.id, 'indirectDirect', v)}
                    options={[
                      { value: 'Direct', label: t('id.direct') },
                      { value: 'Indirect', label: t('id.indirect') },
                    ]}
                  />
                </td>
                <td style={{ color: '#666', ...stickyCell(260, 70, rowBg) }}>
                  <CustomSelect
                    compact
                    value={emp.status}
                    onChange={v => handleEmployeeUpdate(emp.id, 'status', v)}
                    options={[
                      { value: 'Prod.', label: 'Prod.' },
                      { value: 'Jail', label: 'Jail' },
                      { value: 'DailyProduction', label: 'DailyProduction' },
                    ]}
                  />
                </td>
                <td style={{ ...stickyCell(330, 70, rowBg) }}>
                  <CustomSelect
                    compact
                    value={emp.shiftTeam}
                    onChange={v => handleEmployeeUpdate(emp.id, 'shiftTeam', v)}
                    options={[
                      { value: 'Green', label: t('filter.green') },
                      { value: 'Blue', label: t('filter.blue') },
                      { value: 'Orange', label: t('filter.orange') },
                      { value: 'Yellow', label: t('filter.yellow') },
                    ]}
                  />
                </td>
                <td style={{ color: '#666', boxShadow: '2px 0 5px rgba(0,0,0,0.1)', ...stickyCell(400, 70, rowBg) }}>
                  <CustomSelect
                    compact
                    value={emp.gender}
                    onChange={v => handleEmployeeUpdate(emp.id, 'gender', v)}
                    options={[
                      { value: 'Male', label: t('gender.male') },
                      { value: 'Female', label: t('gender.female') },
                    ]}
                  />
                </td>

                {/* Shift cells */}
                {dates.map(date => (
                  <React.Fragment key={date}>
                    <td style={{ padding: 0, borderLeft: '1px solid #f5f5f5' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={emp.shifts[date]?.day || ''}
                        onChange={e => {
                          const v = e.target.value.trim();
                          setEmployees(prev =>
                            prev.map(x =>
                              x.id === emp.id
                                ? { ...x, shifts: { ...x.shifts, [date]: { ...(x.shifts[date] ?? { day: '', night: '' }), day: v } } }
                                : x
                            )
                          );
                        }}
                        onBlur={e => {
                          const savedEmp = savedEmployees.find(se => se.id === emp.id);
                          const orig = savedEmp?.shifts[date]?.day || '';
                          const v = e.target.value.trim();
                          if (v !== orig && !(v && (isNaN(Number(v)) || Number(v) < 0))) {
                            onCellBlur({ emp: savedEmp ?? emp, date, isNight: false, value: v });
                          }
                        }}
                        style={cellInputStyle}
                      />
                    </td>
                    <td style={{ padding: 0, borderLeft: '1px solid #f5f5f5' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={emp.shifts[date]?.night || ''}
                        onChange={e => {
                          const v = e.target.value.trim();
                          setEmployees(prev =>
                            prev.map(x =>
                              x.id === emp.id
                                ? { ...x, shifts: { ...x.shifts, [date]: { ...(x.shifts[date] ?? { day: '', night: '' }), night: v } } }
                                : x
                            )
                          );
                        }}
                        onBlur={e => {
                          const savedEmp = savedEmployees.find(se => se.id === emp.id);
                          const orig = savedEmp?.shifts[date]?.night || '';
                          const v = e.target.value.trim();
                          if (v !== orig && !(v && (isNaN(Number(v)) || Number(v) < 0))) {
                            onCellBlur({ emp: savedEmp ?? emp, date, isNight: true, value: v });
                          }
                        }}
                        style={cellInputStyle}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr>
              <td colSpan={7 + dates.length * 2} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const stickyHead = (left: number, width: number): React.CSSProperties => ({
  width,
  minWidth: width,
  position: 'sticky',
  top: 0,
  left,
  background: '#fafafa',
  zIndex: 5,
  textAlign: 'left',
  padding: '8px 6px',
  fontSize: 12,
  whiteSpace: 'nowrap',
});

const dateHead = (today: boolean): React.CSSProperties => ({
  textAlign: 'center',
  minWidth: 60,
  borderLeft: '1px solid #eee',
  position: 'sticky',
  top: 0,
  background: today ? undefined : '#fafafa',
  zIndex: 4,
  padding: '6px 4px',
  ...(today && {
    background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
  }),
});

const stickyCell = (left: number, width: number, bg: string): React.CSSProperties => ({
  position: 'sticky',
  left,
  background: bg || 'white',
  zIndex: 1,
  width,
  minWidth: width,
  padding: '6px',
  fontSize: 12,
});

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  padding: '8px',
  textAlign: 'center',
  border: 'none',
  background: 'transparent',
  outline: 'none',
  MozAppearance: 'textfield',
  WebkitAppearance: 'none',
  boxSizing: 'border-box',
  fontSize: 12,
};
