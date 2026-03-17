import { memo } from 'react';
import type { Employee, Role, ShiftTeam, WorkStatus } from '../../types';
import type { SelectOption } from '../ui/CustomSelect';
import CustomSelect from '../ui/CustomSelect';

interface GalleryDraft {
  value: string;
  touched: boolean;
}

interface GalleryEmployeeRowProps {
  employee: Employee;
  isSelected: boolean;
  photoUrl: string | null;
  isGalleryEditMode: boolean;
  selectedDateKey: string;
  isNight: boolean;
  draftKey: string;
  draft?: GalleryDraft;
  roleOptions: SelectOption[];
  idStatusOptions: SelectOption[];
  workStatusOptions: SelectOption[];
  shiftTeamOptions: SelectOption[];
  genderOptions: SelectOption[];
  shiftLabel: string;
  roleLabel: string;
  idStatusLabel: string;
  workStatusLabel: string;
  genderLabel: string;
  leaveLabel: string;
  onToggleRowSelection: (employeeId: string) => void;
  onEmployeeUpdate: (employeeId: string, field: keyof Employee, value: string) => void;
  onDraftChange: (draftKey: string, value: string) => void;
  onDraftCommit: (employee: Employee, draftKey: string, currentDraft?: GalleryDraft) => void;
  onTogglePendingLeave: (employeeId: string) => void;
  getShiftClass: (team: string) => string;
}

function GalleryEmployeeRowComponent({
  employee,
  isSelected,
  photoUrl,
  isGalleryEditMode,
  selectedDateKey,
  isNight,
  draftKey,
  draft,
  roleOptions,
  idStatusOptions,
  workStatusOptions,
  shiftTeamOptions,
  genderOptions,
  shiftLabel,
  roleLabel,
  idStatusLabel,
  workStatusLabel,
  genderLabel,
  leaveLabel,
  onToggleRowSelection,
  onEmployeeUpdate,
  onDraftChange,
  onDraftCommit,
  onTogglePendingLeave,
  getShiftClass,
}: GalleryEmployeeRowProps) {
  const initials = employee.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || employee.name.slice(0, 2).toUpperCase();

  const shiftEntry = employee.shifts[selectedDateKey];
  const storedRaw = isNight ? (shiftEntry?.night || '') : (shiftEntry?.day || '');
  const storedParsed = parseInt(String(storedRaw), 10);
  const storedHours = Number.isFinite(storedParsed) && storedParsed > 0 ? String(storedParsed) : '';
  const displayValue = draft ? draft.value : (storedHours || '12');

  return (
    <tr
      style={{
        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
        <input
          type='checkbox'
          checked={isSelected}
          onChange={() => onToggleRowSelection(employee.id)}
          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
        />
      </td>
      <td style={{ color: 'var(--text-secondary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px', padding: '8px 12px' }}>
        {employee.id}
      </td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={employee.name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              {initials}
            </div>
          )}
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{employee.name}</span>
        </div>
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 12px' }}>
        {isGalleryEditMode ? (
          <CustomSelect
            compact
            value={employee.role}
            onChange={(value) => onEmployeeUpdate(employee.id, 'role', value as Role)}
            options={roleOptions}
          />
        ) : roleLabel}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 12px' }}>
        {isGalleryEditMode ? (
          <CustomSelect
            compact
            value={employee.indirectDirect}
            onChange={(value) => onEmployeeUpdate(employee.id, 'indirectDirect', value)}
            options={idStatusOptions}
          />
        ) : idStatusLabel}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 12px' }}>
        {isGalleryEditMode ? (
          <CustomSelect
            compact
            value={employee.status}
            onChange={(value) => onEmployeeUpdate(employee.id, 'status', value as WorkStatus)}
            options={workStatusOptions}
          />
        ) : workStatusLabel}
      </td>
      <td style={{ padding: '8px 12px' }}>
        {isGalleryEditMode ? (
          <CustomSelect
            compact
            value={employee.shiftTeam}
            onChange={(value) => onEmployeeUpdate(employee.id, 'shiftTeam', value as ShiftTeam)}
            options={shiftTeamOptions}
          />
        ) : (
          <span className={`badge ${getShiftClass(employee.shiftTeam)}`} style={{ fontSize: '13px', padding: '4px 10px' }}>
            {shiftLabel}
          </span>
        )}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 12px' }}>
        {isGalleryEditMode ? (
          <CustomSelect
            compact
            value={employee.gender}
            onChange={(value) => onEmployeeUpdate(employee.id, 'gender', value)}
            options={genderOptions}
          />
        ) : genderLabel}
      </td>
      <td style={{ padding: '8px 12px' }}>
        <input
          type='number'
          min={0}
          step={1}
          className='input'
          value={displayValue}
          onChange={(event) => onDraftChange(draftKey, event.target.value)}
          onBlur={() => onDraftCommit(employee, draftKey, draft)}
          style={{ width: '70px', height: '32px', fontSize: '14px' }}
        />
      </td>
      <td style={{ padding: '8px 12px' }}>
        <button
          onClick={() => onTogglePendingLeave(employee.id)}
          className='btn'
          type='button'
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: '#fff3e0',
            color: '#e65100',
            border: '1px solid #ffcc80',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {leaveLabel}
        </button>
      </td>
    </tr>
  );
}

export const GalleryEmployeeRow = memo(GalleryEmployeeRowComponent);