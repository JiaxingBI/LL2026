import attendanceDataJson from './attendanceData.json';
import type { AttendanceDataSource, AttendanceRecord as SourceAttendanceRecord, Employee as UiEmployee } from '../types';

export type EmployeeStatusChoice = '在职' | '离职';
export type ShiftTypeChoice = '白班' | '夜班' | '休息';
export type AttendanceStatusChoice = '正常出勤' | '迟到' | '病假' | '事假' | '旷工';

export type ShiftGroupTable = {
  GroupName: string;
  Supervisor?: string;
  Description?: string;
};

export type EmployeeTable = {
  FullName: string;
  EmployeeID: string;
  ShiftGroup: string; // Lookup -> ShiftGroup.GroupName
  Status: EmployeeStatusChoice;
  Email?: string;
};

export type ShiftPlanTable = {
  Date: string; // ISO yyyy-mm-dd
  TargetGroup: string; // Lookup -> ShiftGroup.GroupName
  ShiftType: ShiftTypeChoice;
  ShiftCode: string;
};

export type AttendanceRecordTable = {
  AttendanceDate: string; // ISO yyyy-mm-dd
  EmployeeID: string; // Lookup -> Employee.EmployeeID
  AttendanceStatus: AttendanceStatusChoice;
  RelatedPlanKey: string; // Lookup -> ShiftPlan key
  Comments?: string;
};

export type FourTablesDataSource = {
  employees: EmployeeTable[];
  shiftGroups: ShiftGroupTable[];
  shiftPlans: ShiftPlanTable[];
  attendanceRecords: AttendanceRecordTable[];

  // Convenience for UI
  uiEmployees: UiEmployee[];
  dateKeys: string[];
  dateKeyToIso: Record<string, string>;
  year: number;
};

const attendanceData = attendanceDataJson as AttendanceDataSource;

function getUtc8Now(): Date {
  const now = new Date();
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMillis + 8 * 60 * 60_000);
}

function isoFromYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDaysUtc(isoDate: string, deltaDays: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  return isoFromYmd(y, m, d);
}

function dateKeyFromIso(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [, month, day] = parts;
  if (!month || !day) return '';
  return `${month}/${day}`;
}

function safeInt(value: unknown): number {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapAttendanceStatusToChoice(status: SourceAttendanceRecord['attendanceStatus']): AttendanceStatusChoice {
  switch (status) {
    case 'Present':
      return '正常出勤';
    case 'Late':
      return '迟到';
    case 'Absent':
      return '旷工';
    case 'Leave':
      return '事假';
    case 'Off':
      return '事假';
    default:
      return '正常出勤';
  }
}

function mapShiftTypeToChoice(shiftType: SourceAttendanceRecord['shiftType']): ShiftTypeChoice {
  switch (shiftType) {
    case 'Day':
      return '白班';
    case 'Night':
      return '夜班';
    case 'Rest':
      return '休息';
    default:
      return '休息';
  }
}

function toShiftTypeForCycleDay(cycleDay: number): SourceAttendanceRecord['shiftType'] {
  // 8-day cycle (work 4, rest 4): D, D, N, N, Off x4
  // This guarantees there is no Night -> next-day Day adjacency.
  if (cycleDay === 0 || cycleDay === 1) return 'Day';
  if (cycleDay === 2 || cycleDay === 3) return 'Night';
  return 'Rest';
}

function buildUiEmployeesFromRemappedRecords(records: SourceAttendanceRecord[]): UiEmployee[] {
  const employeeMap = new Map<string, UiEmployee>();

  for (const emp of attendanceData.employees) {
    employeeMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      role: emp.role as UiEmployee['role'],
      indirectDirect: emp.indirectDirect,
      status: emp.workStatus,
      shiftTeam: emp.shiftTeam,
      gender: emp.gender,
      shifts: {}
    });
  }

  for (const record of records) {
    const employee = employeeMap.get(record.employeeId);
    if (!employee) continue;

    employee.name = record.name || employee.name;
    employee.role = (record.role || employee.role) as UiEmployee['role'];
    employee.indirectDirect = record.indirectDirect;
    employee.status = record.workStatus;
    employee.shiftTeam = record.shiftTeam;

    const dateKey = dateKeyFromIso(record.date);
    if (!dateKey) continue;

    if (!employee.shifts[dateKey]) {
      employee.shifts[dateKey] = { day: '', night: '' };
    }

    const hours = safeInt(record.workingHours);
    const normalizedHours = hours > 0 ? String(hours) : '';

    if (record.shiftType === 'Day') employee.shifts[dateKey].day = normalizedHours;
    if (record.shiftType === 'Night') employee.shifts[dateKey].night = normalizedHours;
  }

  return Array.from(employeeMap.values());
}

export function createFourTablesDataSource(daysAheadInclusive = 30): FourTablesDataSource {
  const nowUtc8 = getUtc8Now();
  const startIso = isoFromYmd(nowUtc8.getFullYear(), nowUtc8.getMonth() + 1, nowUtc8.getDate());

  const targetIsos: string[] = [];
  for (let i = 0; i <= daysAheadInclusive; i++) {
    targetIsos.push(addDaysUtc(startIso, i));
  }

  const dateKeys = targetIsos.map(dateKeyFromIso).filter(Boolean);
  const dateKeyToIso: Record<string, string> = {};
  for (let i = 0; i < targetIsos.length; i++) {
    const key = dateKeys[i];
    if (key) dateKeyToIso[key] = targetIsos[i];
  }

  const groupNameSet = new Set(attendanceData.employees.map(e => e.shiftTeam));
  const shiftGroups: ShiftGroupTable[] = Array.from(groupNameSet).map(groupName => ({
    GroupName: groupName,
    Supervisor: '',
    Description: ''
  }));

  const employees: EmployeeTable[] = attendanceData.employees.map(e => ({
    FullName: e.name,
    EmployeeID: e.id,
    ShiftGroup: e.shiftTeam,
    Status: '在职',
    Email: ''
  }));

  const scheduleConfig = attendanceData.shiftScheduleConfig;
  const rotationCycle = Math.max(1, safeInt(scheduleConfig.rotationCycle || 8));
  const standardShiftHours = Math.max(0, safeInt(scheduleConfig.standardShiftHours || 12));

  // Shift plan: for every (date, group) generate a deterministic shift type.
  // Rule: 4 consecutive work days + 4 rest days; within work days: Day, Day, Night, Night.
  // All employees in the same group share the same plan for the same date.
  const shiftPlanMap = new Map<string, ShiftPlanTable>();
  const computedShiftTypeByDateGroup = new Map<string, SourceAttendanceRecord['shiftType']>();

  for (let dayIndex = 0; dayIndex < targetIsos.length; dayIndex++) {
    const iso = targetIsos[dayIndex];

    for (const g of shiftGroups) {
      const offset = safeInt(scheduleConfig.shiftTeamOffsets?.[g.GroupName] ?? 0);
      const cycleDay = ((dayIndex + offset) % rotationCycle + rotationCycle) % rotationCycle;
      const shiftType = toShiftTypeForCycleDay(cycleDay);

      const shiftTypeChoice = mapShiftTypeToChoice(shiftType);
      const key = `${iso}|${g.GroupName}`;

      computedShiftTypeByDateGroup.set(key, shiftType);
      shiftPlanMap.set(key, {
        Date: iso,
        TargetGroup: g.GroupName,
        ShiftType: shiftTypeChoice,
        ShiftCode:
          shiftTypeChoice === '白班'
            ? `${scheduleConfig.dayShiftStart}-${scheduleConfig.dayShiftEnd}`
            : shiftTypeChoice === '夜班'
              ? `${scheduleConfig.nightShiftStart}-${scheduleConfig.nightShiftEnd}`
              : ''
      });
    }
  }

  // Generate employee attendance records from the shift plan.
  const remappedRecords: SourceAttendanceRecord[] = [];
  for (const emp of attendanceData.employees) {
    for (let dayIndex = 0; dayIndex < targetIsos.length; dayIndex++) {
      const iso = targetIsos[dayIndex];
      const planKey = `${iso}|${emp.shiftTeam}`;
      const shiftType = computedShiftTypeByDateGroup.get(planKey) ?? 'Rest';

      const isWorking = shiftType === 'Day' || shiftType === 'Night';
      const checkInTime = shiftType === 'Day' ? scheduleConfig.dayShiftStart : shiftType === 'Night' ? scheduleConfig.nightShiftStart : null;
      const checkOutTime = shiftType === 'Day' ? scheduleConfig.dayShiftEnd : shiftType === 'Night' ? scheduleConfig.nightShiftEnd : null;

      remappedRecords.push({
        recordId: `${emp.id}-${iso}`,
        date: iso,
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        indirectDirect: emp.indirectDirect,
        workStatus: emp.workStatus,
        shiftTeam: emp.shiftTeam,
        shiftType,
        workingHours: isWorking ? standardShiftHours : 0,
        checkInTime,
        checkOutTime,
        overtimeHours: 0,
        attendanceStatus: isWorking ? 'Present' : 'Off',
        notes: ''
      });
    }
  }

  const shiftPlans = Array.from(shiftPlanMap.values()).sort((a, b) => {
    const d = a.Date.localeCompare(b.Date);
    if (d !== 0) return d;
    return a.TargetGroup.localeCompare(b.TargetGroup);
  });

  const shiftPlanKey = (dateIso: string, groupName: string) => `${dateIso}|${groupName}`;

  const attendanceRecords: AttendanceRecordTable[] = remappedRecords.map(rec => {
    return {
      AttendanceDate: rec.date,
      EmployeeID: rec.employeeId,
      AttendanceStatus: mapAttendanceStatusToChoice(rec.attendanceStatus),
      RelatedPlanKey: shiftPlanKey(rec.date, rec.shiftTeam),
      Comments: rec.notes || ''
    };
  });

  const uiEmployees = buildUiEmployeesFromRemappedRecords(remappedRecords);

  return {
    employees,
    shiftGroups,
    shiftPlans,
    attendanceRecords,
    uiEmployees,
    dateKeys,
    dateKeyToIso,
    year: nowUtc8.getFullYear()
  };
}
