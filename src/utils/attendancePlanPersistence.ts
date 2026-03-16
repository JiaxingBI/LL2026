import type { Adjustment, Employee } from '../types';

export type PersistedShiftType = 'Day' | 'Night';

export const ATTENDANCE_PLAN_STORAGE_KEY = 'laborlink-attendance-plan-state-v1';

export interface PersistedAttendancePlanState {
  version: 1;
  planYear: number;
  employees: Employee[];
  adjustments: Adjustment[];
  savedEmployees: Employee[];
  savedAdjustments: Adjustment[];
  pendingLeaveIds: string[];
  hasChanges: boolean;
}

export function buildPendingLeaveKey(empId: string, dateIso: string, shiftType: PersistedShiftType): string {
  return `${empId}|${dateIso}|${shiftType}`;
}

export function mergeEmployeesWithLocal(baseEmployees: Employee[], localEmployees: Employee[]): Employee[] {
  const localById = new Map(localEmployees.map(employee => [employee.id, employee]));
  return baseEmployees.map(employee => {
    const local = localById.get(employee.id);
    if (!local) return employee;
    return {
      ...employee,
      role: local.role,
      indirectDirect: local.indirectDirect,
      status: local.status,
      shiftTeam: local.shiftTeam,
      gender: local.gender,
      shifts: local.shifts,
    };
  });
}

export function readPersistedAttendancePlanState(planYear: number): PersistedAttendancePlanState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ATTENDANCE_PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAttendancePlanState;
    if (parsed.version !== 1 || parsed.planYear !== planYear) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to read persisted attendance state:', error);
    return null;
  }
}

export function writePersistedAttendancePlanState(state: PersistedAttendancePlanState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(ATTENDANCE_PLAN_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist attendance state:', error);
  }
}